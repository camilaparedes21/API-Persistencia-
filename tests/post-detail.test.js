/* Pruebas HTTP del detalle y el borrado de un post (comentarios y etiquetas).
 Verifican el endpoint completo, no sólo el helper: el GET /posts/:id tiene
 que devolver sólo los comentarios de menos de X meses.*/

process.env.COMMENT_MAX_AGE_MONTHS = '6';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { User, Post, Comment, Tag } = require('../src/models');

const NO_EXISTE = '000000000000000000000000';

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

let mongod;
let user;
let post;
let tag;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Tag.init(), Comment.init()]);
}, 180000);

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  user = await User.create({
    nickName: 'camila',
    firstName: 'Camila',
    lastName: 'Paredes',
    email: 'camila@test.com',
    password: 'Secreto123',
  });
  post = await Post.create({ idUser: user._id, description: 'Mi primer post' });
  tag = await Tag.create({ name: 'viajes', posts: [post._id] });
  await Post.updateOne({ _id: post._id }, { $addToSet: { tags: tag._id } });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

const id = (doc) => doc._id.toString();

describe('GET /posts/:id (detalle del post)', () => {
  test('devuelve sólo los comentarios visibles, con sus etiquetas', async () => {
    await Comment.create({ content: 'nuevo', idUser: user._id, idPost: post._id });
    await Comment.create({ content: 'viejo', idUser: user._id, idPost: post._id, date: monthsAgo(8) });

    const res = await request(app).get(`/posts/${id(post)}`);

    expect(res.status).toBe(200);
    const { publicacion } = res.body;
    expect(publicacion.comentarios).toHaveLength(1);
    expect(publicacion.comentarios[0]).toMatchObject({ content: 'nuevo', isVisible: true });
    expect(publicacion.comentarios[0].idUser).toMatchObject({ nickName: 'camila' });
    expect(publicacion.tags.map((t) => t.name)).toEqual(['viajes']);
    expect(publicacion.idUser).not.toHaveProperty('password');
  });

  test('devuelve el post aunque todos sus comentarios sean viejos', async () => {
    await Comment.create({ content: 'viejo', idUser: user._id, idPost: post._id, date: monthsAgo(8) });

    const res = await request(app).get(`/posts/${id(post)}`);

    expect(res.status).toBe(200);
    expect(res.body.publicacion.comentarios).toEqual([]);
  });

  test('404 si el post no existe y 400 si el id es inválido', async () => {
    expect((await request(app).get(`/posts/${NO_EXISTE}`)).status).toBe(404);
    expect((await request(app).get('/posts/abc')).status).toBe(400);
  });
});

describe('DELETE /posts/:id', () => {
  test('borra sus comentarios y lo saca de sus etiquetas, sin borrar la etiqueta', async () => {
    await Comment.create({ content: 'hola', idUser: user._id, idPost: post._id });

    const res = await request(app).delete(`/posts/${id(post)}`);

    expect(res.status).toBe(200);
    expect(await Post.findById(post._id)).toBeNull();
    expect(await Comment.countDocuments({ idPost: post._id })).toBe(0);
    const tagEnBase = await Tag.findById(tag._id);
    expect(tagEnBase).not.toBeNull();
    expect(tagEnBase.posts).toHaveLength(0);
  });
});
