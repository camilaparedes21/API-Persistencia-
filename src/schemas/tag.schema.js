const Joi = require('joi');
const { objectId, idParam } = require('./common.schema');

// Letras (con acentos y ñ), números, guion y guion bajo. Sin espacios ni '#'.
// trim + lowercase: "  Viajes " se guarda como "viajes".
const name = Joi.string().trim().lowercase().min(1).max(50).pattern(/^[\p{L}\p{N}_-]+$/u).messages({
  'string.base': 'name debe ser un texto',
  'string.empty': 'name no puede estar vacío',
  'string.max': 'name no puede superar los 50 caracteres',
  'string.pattern.base': 'name sólo puede tener letras, números, "-" y "_" (sin espacios ni #)',
  'any.required': 'name es obligatorio',
});

const tagBodySchema = Joi.object({ name: name.required() });

// POST /posts/:postId/tags  { "tagIds": ["...", "..."] }
const assignTagsSchema = Joi.object({
  tagIds: Joi.array().items(objectId.required()).min(1).unique().required().messages({
    'array.base': 'tagIds debe ser una lista de ids',
    'array.min': 'tagIds debe tener al menos un id',
    'array.unique': 'tagIds no puede tener ids repetidos',
    'any.required': 'tagIds es obligatorio',
  }),
});

module.exports = {
  createTagSchema: tagBodySchema,
  updateTagSchema: tagBodySchema,
  assignTagsSchema,
  tagIdParamSchema: idParam('id'),
  postIdParamSchema: idParam('postId'),
  postTagParamsSchema: idParam('postId', 'tagId'),
};
