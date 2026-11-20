/* Controladores de comentarios. Sólo hacen la operación: los datos ya vienen validados (Joi) y 
los documentos ya fueron buscados por ensureExists.*/

const { Comment } = require('../models');
const {
  visibleCommentsFilter,
  hiddenCommentsFilter,
  findVisibleComments,
} = require('../helpers/commentVisibility');

// Autor del comentario: sólo el nickName (nunca email ni password).
const AUTHOR = { path: 'idUser', select: 'nickName' };

// GET /comments?visible=true|false&postId=&userId=
// Lista general: incluye los comentarios viejos, cada uno con su isVisible.
async function getAll(req, res) {
  const { visible, postId, userId } = req.validated?.query || {};
  const filter = {};
  if (postId) filter.idPost = postId;
  if (userId) filter.idUser = userId;
  if (visible === true) Object.assign(filter, visibleCommentsFilter());
  if (visible === false) Object.assign(filter, hiddenCommentsFilter());

  const comments = await Comment.find(filter).populate(AUTHOR).sort({ date: -1 });
  res.json(comments);
}

// GET /comments/:id
async function getById(req, res) {
  const { comment } = req.entities;
  await comment.populate(AUTHOR);
  res.json(comment);
}

// GET /posts/:postId/comments -> sólo los visibles (menos de X meses)
async function getByPost(req, res) {
  res.json(await findVisibleComments(req.entities.post._id));
}

// POST /posts/:postId/comments
async function create(req, res) {
  const { post, user } = req.entities;
  const { content, date } = req.body;

  const comment = await Comment.create({
    content,
    idPost: post._id,
    idUser: user._id,
    ...(date ? { date } : {}),
  });
  await comment.populate(AUTHOR);
  res.status(201).json(comment);
}

// PUT /comments/:id -> sólo se cambia el texto
async function update(req, res) {
  const { comment } = req.entities;
  comment.content = req.body.content;
  await comment.save();
  await comment.populate(AUTHOR);
  res.json(comment);
}

// DELETE /comments/:id
async function remove(req, res) {
  await req.entities.comment.deleteOne();
  res.status(204).send();
}

module.exports = { getAll, getById, getByPost, create, update, remove };
