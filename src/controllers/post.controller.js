/* Controladores de publicaciones e imágenes. Sólo hacen la operación:
 los datos ya vienen validados (Joi) y el post, el usuario y la imagen ya
 fueron buscados por los middlewares (ensureExists / ensurePostHasImage).
 Si algo falla, Express 5 pasa el error al errorHandler.*/

const { Post, PostImage, Comment, Tag } = require('../models');
const { findVisibleComments } = require('../helpers/commentVisibility');

// GET /posts -> todas las publicaciones, de la más nueva a la más vieja
async function getAll(req, res) {
  const publicaciones = await Post.find()
    .sort({ createdAt: -1 })
    .populate('idUser', '-password')
    .populate('imagen');

  res.status(200).json({
    mensaje: 'Publicaciones obtenidas correctamente.',
    publicaciones,
  });
}

// GET /posts/:id -> autor, imágenes, etiquetas y SÓLO los comentarios visibles
async function getById(req, res) {
  const { post } = req.entities;
  await post.populate([
    { path: 'idUser', select: '-password' },
    { path: 'imagen' },
    { path: 'tags', select: 'name' },
  ]);

  // Se filtran en la consulta por fecha, con la misma fecha límite que el virtual isVisible
  const comentarios = await findVisibleComments(post._id);

  res.status(200).json({
    mensaje: 'Publicación obtenida correctamente.',
    publicacion: { ...post.toJSON(), comentarios },
  });
}

// POST /posts
async function create(req, res) {
  const { user } = req.entities;
  const publicacion = await Post.create({
    description: req.body.description,
    idUser: user._id,
  });

  res.status(201).json({
    mensaje: 'Publicación creada correctamente.',
    publicacion,
  });
}

// PUT /posts/:id -> sólo se cambia la descripción
async function update(req, res) {
  const { post } = req.entities;
  post.description = req.body.description;
  await post.save();

  res.status(200).json({
    mensaje: 'Publicación actualizada correctamente.',
    publicacion: post,
  });
}

// DELETE /posts/:id
// MongoDB no borra en cascada: se borran sus imágenes y comentarios,
// y se saca el post de las etiquetas que lo tenían (las etiquetas no se borran).
async function remove(req, res) {
  const { post } = req.entities;

  await PostImage.deleteMany({ idPost: post._id });
  await Comment.deleteMany({ idPost: post._id });
  await Tag.updateMany({ posts: post._id }, { $pull: { posts: post._id } });
  await post.deleteOne();

  res.status(200).json({
    mensaje: 'Publicación, sus imágenes y sus comentarios eliminados correctamente.',
    publicacion: post,
  });
}

// POST /posts/:id/images
async function addImage(req, res) {
  const { post } = req.entities;

  const imagen = await PostImage.create({
    idPost: post._id,
    imageUrl: req.body.url,
  });

  post.imagen.push(imagen._id);
  await post.save();

  res.status(201).json({
    mensaje: 'Imagen agregada correctamente.',
    imagen,
    publicacion: post,
  });
}

// DELETE /posts/:id/images/:imageId
async function removeImage(req, res) {
  const { post, image } = req.entities;

  post.imagen.pull(image._id);
  await post.save();
  await image.deleteOne();

  res.status(200).json({
    mensaje: 'Imagen eliminada correctamente.',
    publicacion: post,
  });
}

module.exports = { getAll, getById, create, update, remove, addImage, removeImage };
