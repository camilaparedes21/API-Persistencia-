const Joi = require('joi');
const { objectId, idParam } = require('./common.schema');

const content = Joi.string().trim().min(1).max(1000).messages({
  'string.base': 'content debe ser un texto',
  'string.empty': 'content no puede estar vacío',
  'string.min': 'content no puede estar vacío',
  'string.max': 'content no puede superar los 1000 caracteres',
  'any.required': 'content es obligatorio',
});

// POST /posts/:postId/comments
const createCommentSchema = Joi.object({
  userId: objectId.required(),
  content: content.required(),
  // Opcional: si no se envía se usa la fecha actual. No se permiten fechas futuras.
  date: Joi.date().max('now').messages({
    'date.base': 'date debe ser una fecha válida (ej.: 2026-01-15T10:00:00Z)',
    'date.max': 'date no puede ser una fecha futura',
  }),
});

// PUT /comments/:id -> sólo se puede cambiar el texto
const updateCommentSchema = Joi.object({ content: content.required() });

// GET /comments?visible=true|false&postId=&userId=
const listCommentsQuerySchema = Joi.object({
  visible: Joi.boolean(),
  postId: objectId,
  userId: objectId,
});

module.exports = {
  createCommentSchema,
  updateCommentSchema,
  listCommentsQuerySchema,
  commentIdParamSchema: idParam('id'),
  postIdParamSchema: idParam('postId'),
};
