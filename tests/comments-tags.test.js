

process.env.COMMENT_MAX_AGE_MONTHS = '6';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { User, Post, Comment, Tag } = require('../src/models');
const { findVisibleComments } = require('../src/helpers/commentVisibility');

const NO_EXISTE = '000000000000000000000000'; // id con formato válido que no está en la base

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

let mongod;
let user;
let post;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Tag.init(), Comment.init()]); // crea los índices (unique)
}, 180000);

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  user = await User.create({
    nickName: 'camila',
    firstName: 'Camila',
    lastName: 'Paredes',
    email: 'camila@test.com',
    password: 'secreto123',
  });
  post = await Post.create({ idUser: user._id, description: 'Mi primer post' });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

const id = (doc) => doc._id.toString();

// -------------------- Comentarios
describe('Comentarios', () => {
  test('crea un comentario válido (201) con isVisible = true', async () => {
    const res = await request(app)
      .post(`/posts/${id(post)}/comments`)
      .send({ userId: id(user), content: 'Buenísimo' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ content: 'Buenísimo', idPost: id(post), isVisible: true });
    expect(res.body.idUser).toMatchObject({ _id: id(user), nickName: 'camila' });
    expect(res.body.idUser).not.toHaveProperty('password');
  });

  test('400 si falta content o userId', async () => {
    const res = await request(app).post(`/posts/${id(post)}/comments`).send({});
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['userId', 'content']));
  });

  test('400 si content está vacío o tiene sólo espacios', async () => {
    const res = await request(app)
      .post(`/posts/${id(post)}/comments`)
      .send({ userId: id(user), content: '   ' });
    expect(res.status).toBe(400);
  });

  test('400 si la fecha es futura', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const res = await request(app)
      .post(`/posts/${id(post)}/comments`)
      .send({ userId: id(user), content: 'hola', date: future });
    expect(res.status).toBe(400);
  });

  test('400 si el id del post o del usuario tiene formato inválido', async () => {
    expect((await request(app).get('/posts/abc/comments')).status).toBe(400);
    const res = await request(app)
      .post(`/posts/${id(post)}/comments`)
      .send({ userId: 'abc', content: 'hola' });
    expect(res.status).toBe(400);
  });

  test('404 si el post no existe', async () => {
    const res = await request(app)
      .post(`/posts/${NO_EXISTE}/comments`)
      .send({ userId: id(user), content: 'hola' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Post/);
  });

  test('404 si el usuario no existe', async () => {
    const res = await request(app)
      .post(`/posts/${id(post)}/comments`)
      .send({ userId: NO_EXISTE, content: 'hola' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Usuario/);
  });

  test('"isVisible" no se guarda en la base', async () => {
    const c = await Comment.create({ content: 'x', idUser: user._id, idPost: post._id });
    const raw = await Comment.collection.findOne({ _id: c._id });
    expect(raw).not.toHaveProperty('isVisible');
    expect(raw).toHaveProperty('date');
  });

  test('el virtual se calcula según la antigüedad', async () => {
    const nuevo = await Comment.create({ content: 'nuevo', idUser: user._id, idPost: post._id });
    const viejo = await Comment.create({
      content: 'viejo', idUser: user._id, idPost: post._id, date: monthsAgo(8),
    });
    expect(nuevo.isVisible).toBe(true);
    expect(viejo.isVisible).toBe(false);
  });

  test('GET /posts/:postId/comments excluye los comentarios viejos', async () => {
    await Comment.create({ content: 'nuevo', idUser: user._id, idPost: post._id });
    await Comment.create({ content: 'viejo', idUser: user._id, idPost: post._id, date: monthsAgo(8) });

    const res = await request(app).get(`/posts/${id(post)}/comments`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].content).toBe('nuevo');
  });

  test('GET /comments muestra todos, y filtra con ?visible=false', async () => {
    await Comment.create({ content: 'nuevo', idUser: user._id, idPost: post._id });
    await Comment.create({ content: 'viejo', idUser: user._id, idPost: post._id, date: monthsAgo(8) });

    expect((await request(app).get('/comments')).body).toHaveLength(2);

    const hidden = await request(app).get('/comments?visible=false');
    expect(hidden.body).toHaveLength(1);
    expect(hidden.body[0]).toMatchObject({ content: 'viejo', isVisible: false });
  });

  test('findVisibleComments (para el GET de un post) excluye los viejos', async () => {
    await Comment.create({ content: 'nuevo', idUser: user._id, idPost: post._id });
    await Comment.create({ content: 'viejo', idUser: user._id, idPost: post._id, date: monthsAgo(8) });

    const comments = await findVisibleComments(post._id);
    expect(comments).toHaveLength(1);
    expect(comments[0].content).toBe('nuevo');
  });

  test('X se toma de la variable de entorno', async () => {
    const c = await Comment.create({
      content: 'de hace 8 meses', idUser: user._id, idPost: post._id, date: monthsAgo(8),
    });
    process.env.COMMENT_MAX_AGE_MONTHS = '12';
    expect(c.isVisible).toBe(true);
    process.env.COMMENT_MAX_AGE_MONTHS = '6';
    expect(c.isVisible).toBe(false);
  });

  test('GET, PUT y DELETE de /comments/:id', async () => {
    const c = await Comment.create({ content: 'original', idUser: user._id, idPost: post._id });

    expect((await request(app).get(`/comments/${id(c)}`)).status).toBe(200);

    const put = await request(app).put(`/comments/${id(c)}`).send({ content: 'editado' });
    expect(put.status).toBe(200);
    expect(put.body.content).toBe('editado');

    expect((await request(app).delete(`/comments/${id(c)}`)).status).toBe(204);
    expect((await request(app).get(`/comments/${id(c)}`)).status).toBe(404);
  });

  test('404 al editar o borrar un comentario inexistente, 400 con id inválido', async () => {
    expect((await request(app).put(`/comments/${NO_EXISTE}`).send({ content: 'x' })).status).toBe(404);
    expect((await request(app).delete(`/comments/${NO_EXISTE}`)).status).toBe(404);
    expect((await request(app).get('/comments/abc')).status).toBe(400);
  });
});

// -------------------------Etiquetas
describe('Etiquetas', () => {
  test('crea una etiqueta y la normaliza en minúsculas', async () => {
    const res = await request(app).post('/tags').send({ name: '  Viajes ' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('viajes');
  });

  test('409 si el nombre ya existe (sin importar mayúsculas)', async () => {
    await request(app).post('/tags').send({ name: 'viajes' });
    const res = await request(app).post('/tags').send({ name: 'VIAJES' });
    expect(res.status).toBe(409);
  });

  test('400 si el nombre tiene espacios o está vacío', async () => {
    expect((await request(app).post('/tags').send({ name: 'dos palabras' })).status).toBe(400);
    expect((await request(app).post('/tags').send({ name: '' })).status).toBe(400);
    expect((await request(app).post('/tags').send({})).status).toBe(400);
  });

  test('GET, PUT y DELETE de /tags/:id', async () => {
    const tag = await Tag.create({ name: 'musica' });

    expect((await request(app).get('/tags')).body).toHaveLength(1);

    const put = await request(app).put(`/tags/${id(tag)}`).send({ name: 'rock' });
    expect(put.status).toBe(200);
    expect(put.body.name).toBe('rock');

    expect((await request(app).delete(`/tags/${id(tag)}`)).status).toBe(204);
    expect((await request(app).get(`/tags/${id(tag)}`)).status).toBe(404);
  });

  test('409 al renombrar con un nombre que ya existe', async () => {
    await Tag.create({ name: 'rock' });
    const tag = await Tag.create({ name: 'pop' });
    const res = await request(app).put(`/tags/${id(tag)}`).send({ name: 'rock' });
    expect(res.status).toBe(409);
  });
});

// ------------ Etiquetas de un post
describe('Etiquetas en publicaciones (N a M)', () => {
  test('asigna varias etiquetas y actualiza los dos lados', async () => {
    const t1 = await Tag.create({ name: 'viajes' });
    const t2 = await Tag.create({ name: 'playa' });

    const res = await request(app)
      .post(`/posts/${id(post)}/tags`)
      .send({ tagIds: [id(t1), id(t2)] });

    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.name)).toEqual(['playa', 'viajes']);

    const tagEnBase = await Tag.findById(t1._id);
    expect(tagEnBase.posts.map(String)).toEqual([id(post)]);
  });

  test('una misma etiqueta puede estar en muchos posts', async () => {
    const tag = await Tag.create({ name: 'viajes' });
    const post2 = await Post.create({ idUser: user._id, description: 'Otro post' });

    await request(app).post(`/posts/${id(post)}/tags`).send({ tagIds: [id(tag)] });
    await request(app).post(`/posts/${id(post2)}/tags`).send({ tagIds: [id(tag)] });

    const res = await request(app).get(`/tags/${id(tag)}`);
    expect(res.body.posts).toHaveLength(2);
  });

  test('asignar dos veces la misma etiqueta no la duplica', async () => {
    const tag = await Tag.create({ name: 'viajes' });
    await request(app).post(`/posts/${id(post)}/tags`).send({ tagIds: [id(tag)] });
    const res = await request(app).post(`/posts/${id(post)}/tags`).send({ tagIds: [id(tag)] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect((await Tag.findById(tag._id)).posts).toHaveLength(1);
  });

  test('404 si algún tag no existe, y no asigna ninguno', async () => {
    const tag = await Tag.create({ name: 'viajes' });
    const res = await request(app)
      .post(`/posts/${id(post)}/tags`)
      .send({ tagIds: [id(tag), NO_EXISTE] });

    expect(res.status).toBe(404);
    expect(res.body.details.missingTagIds).toEqual([NO_EXISTE]);
    expect((await request(app).get(`/posts/${id(post)}/tags`)).body).toHaveLength(0);
  });

  test('400 si tagIds está vacío, repetido, no es una lista o tiene ids inválidos', async () => {
    const url = `/posts/${id(post)}/tags`;
    expect((await request(app).post(url).send({ tagIds: [] })).status).toBe(400);
    expect((await request(app).post(url).send({ tagIds: [NO_EXISTE, NO_EXISTE] })).status).toBe(400);
    expect((await request(app).post(url).send({ tagIds: 'viajes' })).status).toBe(400);
    expect((await request(app).post(url).send({ tagIds: ['abc'] })).status).toBe(400);
  });

  test('404 si el post no existe', async () => {
    const tag = await Tag.create({ name: 'viajes' });
    const res = await request(app).post(`/posts/${NO_EXISTE}/tags`).send({ tagIds: [id(tag)] });
    expect(res.status).toBe(404);
  });

  test('quita una etiqueta de un post (en los dos lados) sin borrar la etiqueta', async () => {
    const tag = await Tag.create({ name: 'viajes' });
    await request(app).post(`/posts/${id(post)}/tags`).send({ tagIds: [id(tag)] });

    const res = await request(app).delete(`/posts/${id(post)}/tags/${id(tag)}`);
    expect(res.status).toBe(204);
    expect((await Post.findById(post._id)).tags).toHaveLength(0);
    const tagEnBase = await Tag.findById(tag._id);
    expect(tagEnBase).not.toBeNull();
    expect(tagEnBase.posts).toHaveLength(0);
  });

  test('404 al quitar una etiqueta que el post no tiene', async () => {
    const tag = await Tag.create({ name: 'viajes' });
    const res = await request(app).delete(`/posts/${id(post)}/tags/${id(tag)}`);
    expect(res.status).toBe(404);
  });

  test('borrar un tag lo saca de los posts que lo usaban, sin borrar los posts', async () => {
    const tag = await Tag.create({ name: 'viajes' });
    await request(app).post(`/posts/${id(post)}/tags`).send({ tagIds: [id(tag)] });

    await request(app).delete(`/tags/${id(tag)}`);
    const postEnBase = await Post.findById(post._id);
    expect(postEnBase).not.toBeNull();
    expect(postEnBase.tags).toHaveLength(0);
  });
});
