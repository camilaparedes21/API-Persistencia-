/* Controladores de etiquetas. Los datos ya vienen validados y la etiqueta
 ya fue buscada por ensureExists (req.entities.tag).*/

const { Tag, Post } = require('../models');

// GET /tags
async function getAll(req, res) {
  res.json(await Tag.find().select('name').sort({ name: 1 }));
}

// GET /tags/:id -> la etiqueta con los posts que la usan
async function getById(req, res) {
  const { tag } = req.entities;
  await tag.populate({ path: 'posts', select: 'description idUser' });
  res.json(tag);
}

// POST /tags  (nombre repetido -> el índice único da 409 en el errorHandler)
async function create(req, res) {
  const tag = await Tag.create({ name: req.body.name });
  res.status(201).json(tag);
}

// PUT /tags/:id
async function update(req, res) {
  const { tag } = req.entities;
  tag.name = req.body.name;
  await tag.save();
  res.json(tag);
}

// DELETE /tags/:id
// MongoDB no borra en cascada: se saca la etiqueta de todos los posts que la tenían.
async function remove(req, res) {
  const { tag } = req.entities;
  await Post.updateMany({ tags: tag._id }, { $pull: { tags: tag._id } });
  await tag.deleteOne();
  res.status(204).send();
}

module.exports = { getAll, getById, create, update, remove };
