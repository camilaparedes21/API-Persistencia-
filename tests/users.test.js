/* Pruebas HTTP de usuarios: alta, consulta, edición, contraseña hasheada,
 seguir / dejar de seguir, borrado en cascada y formato de los errores.*/

process.env.COMMENT_MAX_AGE_MONTHS = '6';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { User, Post, Comment, Tag, PostImage } = require('../src/models');
const { verifyPassword } = require('../src/utils/password');

const NO_EXISTE = '000000000000000000000000'; // id con formato válido que no está en la base

let mongod;
let ana;
let beto;

const nuevoUsuario = (datos = {}) => ({
  nickName: 'carla',
  firstName: 'Carla',
  lastName: 'Diaz',
  email: 'carla@test.com',
  password: 'Secreto123',
  ...datos,
});

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Tag.init(), Comment.init(), PostImage.init()]); // crea los índices (unique)
}, 180000);

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  ana = await User.create({ nickName: 'anaaa', firstName: 'Ana', lastName: 'Gomez', email: 'ana@test.com', password: 'Secreto123' });
  beto = await User.create({ nickName: 'beto', firstName: 'Beto', lastName: 'Perez', email: 'beto@test.com', password: 'Secreto123' });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

const id = (doc) => doc._id.toString();

describe('POST /users', () => {
  test('crea el usuario y no devuelve la contraseña', async () => {
    const res = await request(app).post('/users').send(nuevoUsuario());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nickName: 'carla', firstName: 'Carla', email: 'carla@test.com' });
    expect(res.body).not.toHaveProperty('password');
  });

  test('guarda la contraseña hasheada, nunca en texto plano', async () => {
    const res = await request(app).post('/users').send(nuevoUsuario());

    const enBase = await User.findById(res.body._id).select('+password');
    expect(enBase.password).not.toBe('Secreto123');
    expect(enBase.password.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('Secreto123', enBase.password)).toBe(true);
    expect(verifyPassword('OtraClave1', enBase.password)).toBe(false);
  });

  test('dos usuarios con la misma contraseña quedan con hashes distintos', async () => {
    const [a, b] = await Promise.all([
      User.findById(ana._id).select('+password'),
      User.findById(beto._id).select('+password'),
    ]);
    expect(a.password).not.toBe(b.password);
  });

  test('409 si el nickName ya existe', async () => {
    const res = await request(app).post('/users').send(nuevoUsuario({ nickName: 'anaaa' }));

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  test('400 con el detalle de cada dato inválido', async () => {
    const res = await request(app).post('/users').send(nuevoUsuario({ email: 'no-es-email', password: '123' }));

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    const campos = res.body.details.map((d) => d.field);
    expect(campos).toEqual(expect.arrayContaining(['email', 'password']));
  });

  test('400 si falta un campo obligatorio', async () => {
    const { nickName, ...sinNick } = nuevoUsuario();
    const res = await request(app).post('/users').send(sinNick);

    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field)).toContain('nickName');
  });
});

describe('GET /users', () => {
  test('lista los usuarios sin contraseña y con la cantidad de seguidores', async () => {
    const res = await request(app).get('/users');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    res.body.forEach((u) => {
      expect(u).not.toHaveProperty('password');
      expect(u).toMatchObject({ seguidores: 0, seguidos: 0 });
    });
  });

  test('GET /users/:id devuelve el usuario sin contraseña', async () => {
    const res = await request(app).get(`/users/${id(ana)}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ _id: id(ana), nickName: 'anaaa' });
    expect(res.body).not.toHaveProperty('password');
  });

  test('400 si el id tiene formato inválido y 404 si no existe, con { error }', async () => {
    const invalido = await request(app).get('/users/abc');
    expect(invalido.status).toBe(400);
    expect(invalido.body).toHaveProperty('error');

    const inexistente = await request(app).get(`/users/${NO_EXISTE}`);
    expect(inexistente.status).toBe(404);
    expect(inexistente.body).toHaveProperty('error');
  });
});

describe('PUT /users/:id', () => {
  test('actualiza los datos y no devuelve la contraseña', async () => {
    const res = await request(app).put(`/users/${id(ana)}`).send({ firstName: 'Anita' });

    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Anita');
    expect(res.body).not.toHaveProperty('password');
    expect((await User.findById(ana._id)).firstName).toBe('Anita');
  });

  test('al cambiar la contraseña se guarda el nuevo hash', async () => {
    const res = await request(app).put(`/users/${id(ana)}`).send({ password: 'NuevaCl4ve' });

    expect(res.status).toBe(200);
    const enBase = await User.findById(ana._id).select('+password');
    expect(verifyPassword('NuevaCl4ve', enBase.password)).toBe(true);
    expect(verifyPassword('Secreto123', enBase.password)).toBe(false);
  });

  test('cambiar otro dato no vuelve a hashear la contraseña', async () => {
    const antes = (await User.findById(ana._id).select('+password')).password;
    await request(app).put(`/users/${id(ana)}`).send({ lastName: 'Gimenez' });
    const despues = (await User.findById(ana._id).select('+password')).password;

    expect(despues).toBe(antes);
  });

  test('400 si no se envía ningún dato', async () => {
    const res = await request(app).put(`/users/${id(ana)}`).send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('404 si el usuario no existe', async () => {
    const res = await request(app).put(`/users/${NO_EXISTE}`).send({ firstName: 'Nadie' });
    expect(res.status).toBe(404);
  });
});

describe('Seguir y dejar de seguir', () => {
  const seguir = (seguido, seguidor) =>
    request(app).put(`/users/${seguido}/seguir`).send({ idSeguidor: seguidor });
  const dejarDeSeguir = (seguido, seguidor) =>
    request(app).put(`/users/${seguido}/dejar-de-seguir`).send({ idSeguidor: seguidor });

  test('seguir actualiza los dos lados de la relación', async () => {
    const res = await seguir(id(ana), id(beto));

    expect(res.status).toBe(200);
    expect((await User.findById(beto._id)).seguidos.map(String)).toEqual([id(ana)]);
    expect((await User.findById(ana._id)).seguidores.map(String)).toEqual([id(beto)]);

    const anaRes = await request(app).get(`/users/${id(ana)}`);
    expect(anaRes.body.seguidores).toBe(1);
  });

  test('409 si ya lo sigue', async () => {
    await seguir(id(ana), id(beto));
    const res = await seguir(id(ana), id(beto));

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
    expect((await User.findById(ana._id)).seguidores).toHaveLength(1);
  });

  test('400 si un usuario intenta seguirse a sí mismo', async () => {
    const res = await seguir(id(ana), id(ana));
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('400 si algún id es inválido y 404 si algún usuario no existe', async () => {
    expect((await seguir('abc', id(beto))).status).toBe(400);
    expect((await seguir(id(ana), '123')).status).toBe(400);
    expect((await seguir(NO_EXISTE, id(beto))).status).toBe(404);
    expect((await seguir(id(ana), NO_EXISTE)).status).toBe(404);
  });

  test('dejar de seguir quita la relación de los dos lados', async () => {
    await seguir(id(ana), id(beto));
    const res = await dejarDeSeguir(id(ana), id(beto));

    expect(res.status).toBe(200);
    expect((await User.findById(beto._id)).seguidos).toHaveLength(0);
    expect((await User.findById(ana._id)).seguidores).toHaveLength(0);
  });

  test('400 si se intenta dejar de seguir a alguien que no se sigue', async () => {
    const res = await dejarDeSeguir(id(ana), id(beto));
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('DELETE /users/:id', () => {
  test('borra al usuario y todo lo relacionado, sin tocar lo de otros usuarios', async () => {
    // Publicación de Ana con una imagen, una etiqueta y un comentario de Beto
    const postAna = await Post.create({ idUser: ana._id, description: 'Post de Ana' });
    const imagen = await PostImage.create({ idPost: postAna._id, imageUrl: 'https://test.com/ana.jpg' });
    const tag = await Tag.create({ name: 'viajes', posts: [postAna._id] });
    await Post.updateOne({ _id: postAna._id }, { $push: { imagen: imagen._id, tags: tag._id } });
    const comentarioDeBeto = await Comment.create({ idPost: postAna._id, idUser: beto._id, content: 'Lindo' });

    // Publicación de Beto con un comentario de Ana y otro de Beto
    const postBeto = await Post.create({ idUser: beto._id, description: 'Post de Beto' });
    const comentarioDeAna = await Comment.create({ idPost: postBeto._id, idUser: ana._id, content: 'Hola' });
    const comentarioPropio = await Comment.create({ idPost: postBeto._id, idUser: beto._id, content: 'Gracias' });

    // Se siguen mutuamente
    await User.updateOne({ _id: ana._id }, { $push: { seguidos: beto._id, seguidores: beto._id } });
    await User.updateOne({ _id: beto._id }, { $push: { seguidos: ana._id, seguidores: ana._id } });

    const res = await request(app).delete(`/users/${id(ana)}`);
    expect(res.status).toBe(200);

    // Lo de Ana desaparece
    expect(await User.findById(ana._id)).toBeNull();
    expect(await Post.findById(postAna._id)).toBeNull();
    expect(await PostImage.findById(imagen._id)).toBeNull();
    expect(await Comment.findById(comentarioDeBeto._id)).toBeNull(); // estaba en un post de Ana
    expect(await Comment.findById(comentarioDeAna._id)).toBeNull(); // lo escribió Ana

    // La etiqueta queda, pero sin la publicación borrada
    const tagEnBase = await Tag.findById(tag._id);
    expect(tagEnBase).not.toBeNull();
    expect(tagEnBase.posts).toHaveLength(0);

    // Lo de Beto sigue, y ya no tiene a Ana en sus seguidos / seguidores
    expect(await Post.findById(postBeto._id)).not.toBeNull();
    expect(await Comment.findById(comentarioPropio._id)).not.toBeNull();
    const betoEnBase = await User.findById(beto._id);
    expect(betoEnBase.seguidos).toHaveLength(0);
    expect(betoEnBase.seguidores).toHaveLength(0);
  });

  test('404 si el usuario no existe y 400 si el id es inválido', async () => {
    expect((await request(app).delete(`/users/${NO_EXISTE}`)).status).toBe(404);
    expect((await request(app).delete('/users/abc')).status).toBe(400);
  });
});
