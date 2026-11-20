/* Pruebas HTTP de publicaciones e imágenes: validaciones con Joi,
 fecha de la publicación, URL http/https, imágenes repetidas y borrados.*/

process.env.COMMENT_MAX_AGE_MONTHS = '6';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { User, Post, Comment, Tag, PostImage } = require('../src/models');

const NO_EXISTE = '000000000000000000000000'; // id con formato válido que no está en la base

let mongod;
let user;
let post;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Tag.init(), Comment.init(), PostImage.init()]); // crea los índices (unique)
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
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

const id = (doc) => doc._id.toString();
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

describe('POST /posts', () => {
  test('crea la publicación con su fecha y la descripción sin espacios sobrantes', async () => {
    const res = await request(app).post('/posts').send({ description: '  Hola mundo  ', userId: id(user) });

    expect(res.status).toBe(201);
    const { publicacion } = res.body;
    expect(publicacion.description).toBe('Hola mundo');
    expect(publicacion.idUser).toBe(id(user));
    expect(new Date(publicacion.createdAt).toString()).not.toBe('Invalid Date');
    expect(publicacion).toHaveProperty('updatedAt');
  });

  test('400 si la descripción falta o sólo tiene espacios', async () => {
    const sinDescripcion = await request(app).post('/posts').send({ userId: id(user) });
    expect(sinDescripcion.status).toBe(400);
    expect(sinDescripcion.body).toHaveProperty('error');

    const soloEspacios = await request(app).post('/posts').send({ description: '   ', userId: id(user) });
    expect(soloEspacios.status).toBe(400);
  });

  test('400 si el userId es inválido y 404 si el usuario no existe', async () => {
    const invalido = await request(app).post('/posts').send({ description: 'Hola', userId: '123' });
    expect(invalido.status).toBe(400);

    const inexistente = await request(app).post('/posts').send({ description: 'Hola', userId: NO_EXISTE });
    expect(inexistente.status).toBe(404);
    expect(inexistente.body).toHaveProperty('error');
    expect(await Post.countDocuments()).toBe(1); // no se creó nada
  });
});

describe('GET /posts', () => {
  test('lista de la más nueva a la más vieja, con el autor sin contraseña', async () => {
    await esperar(15);
    const nueva = await Post.create({ idUser: user._id, description: 'Más nueva' });

    const res = await request(app).get('/posts');

    expect(res.status).toBe(200);
    const ids = res.body.publicaciones.map((p) => p._id);
    expect(ids).toEqual([id(nueva), id(post)]);
    res.body.publicaciones.forEach((p) => expect(p.idUser).not.toHaveProperty('password'));
  });

  test('400 si el id es inválido y 404 si no existe', async () => {
    expect((await request(app).get('/posts/abc')).status).toBe(400);
    expect((await request(app).get(`/posts/${NO_EXISTE}`)).status).toBe(404);
  });
});

describe('PUT /posts/:id', () => {
  test('cambia la descripción y actualiza updatedAt', async () => {
    await esperar(15);
    const res = await request(app).put(`/posts/${id(post)}`).send({ description: 'Editada' });

    expect(res.status).toBe(200);
    expect(res.body.publicacion.description).toBe('Editada');
    const enBase = await Post.findById(post._id);
    expect(enBase.description).toBe('Editada');
    expect(enBase.updatedAt.getTime()).toBeGreaterThan(enBase.createdAt.getTime());
  });

  test('400 si la descripción queda vacía y 404 si el post no existe', async () => {
    expect((await request(app).put(`/posts/${id(post)}`).send({ description: '' })).status).toBe(400);
    expect((await request(app).put(`/posts/${NO_EXISTE}`).send({ description: 'Hola' })).status).toBe(404);
  });
});

describe('Imágenes de una publicación', () => {
  const agregar = (url, postId = id(post)) => request(app).post(`/posts/${postId}/images`).send({ url });

  test('agrega la imagen y la asocia al post', async () => {
    const res = await agregar('https://test.com/foto.jpg');

    expect(res.status).toBe(201);
    expect(res.body.imagen).toMatchObject({ imageUrl: 'https://test.com/foto.jpg', idPost: id(post) });
    const enBase = await Post.findById(post._id);
    expect(enBase.imagen.map(String)).toEqual([res.body.imagen._id]);
  });

  test('acepta http y https', async () => {
    expect((await agregar('http://test.com/a.png')).status).toBe(201);
    expect((await agregar('https://test.com/b.png')).status).toBe(201);
  });

  test('400 si la URL no es válida o no es http/https', async () => {
    for (const url of ['no-es-url', 'ftp://test.com/foto.jpg', 'javascript:alert(1)', '']) {
      const res = await agregar(url);
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    }
    const sinUrl = await request(app).post(`/posts/${id(post)}/images`).send({});
    expect(sinUrl.status).toBe(400);
    expect(await PostImage.countDocuments()).toBe(0);
  });

  test('409 si la URL ya está cargada', async () => {
    await agregar('https://test.com/foto.jpg');
    const res = await agregar('https://test.com/foto.jpg');

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  test('404 si el post no existe', async () => {
    expect((await agregar('https://test.com/foto.jpg', NO_EXISTE)).status).toBe(404);
  });

  test('quita la imagen del post y la borra', async () => {
    const { body } = await agregar('https://test.com/foto.jpg');
    const imageId = body.imagen._id;

    const res = await request(app).delete(`/posts/${id(post)}/images/${imageId}`);

    expect(res.status).toBe(200);
    expect(await PostImage.findById(imageId)).toBeNull();
    expect((await Post.findById(post._id)).imagen).toHaveLength(0);
  });

  test('404 si la imagen no existe o es de otro post, y 400 si el id es inválido', async () => {
    const otroPost = await Post.create({ idUser: user._id, description: 'Otro' });
    const { body } = await agregar('https://test.com/otra.jpg', id(otroPost));

    expect((await request(app).delete(`/posts/${id(post)}/images/${body.imagen._id}`)).status).toBe(404);
    expect((await request(app).delete(`/posts/${id(post)}/images/${NO_EXISTE}`)).status).toBe(404);
    expect((await request(app).delete(`/posts/${id(post)}/images/abc`)).status).toBe(400);
    expect(await PostImage.findById(body.imagen._id)).not.toBeNull(); // la del otro post sigue
  });
});

describe('DELETE /posts/:id', () => {
  test('borra también sus imágenes', async () => {
    const { body } = await request(app).post(`/posts/${id(post)}/images`).send({ url: 'https://test.com/foto.jpg' });

    const res = await request(app).delete(`/posts/${id(post)}`);

    expect(res.status).toBe(200);
    expect(await Post.findById(post._id)).toBeNull();
    expect(await PostImage.findById(body.imagen._id)).toBeNull();
  });

  test('404 si no existe y 400 si el id es inválido', async () => {
    expect((await request(app).delete(`/posts/${NO_EXISTE}`)).status).toBe(404);
    expect((await request(app).delete('/posts/abc')).status).toBe(400);
  });
});
