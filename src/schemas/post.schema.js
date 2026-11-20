const Joi = require('joi');
const { objectId, idParam } = require('./common.schema');

// Toda publicación tiene obligatoriamente una descripción (sin espacios sobrantes).
const description = Joi.string().trim().min(1).max(2000).messages({
  'string.base': 'description debe ser un texto',
  'string.empty': 'description no puede estar vacía',
  'string.min': 'description no puede estar vacía',
  'string.max': 'description no puede superar los 2000 caracteres',
  'any.required': 'description es obligatoria',
});

// La URL de una imagen tiene que ser una dirección http o https válida.
const url = Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(2048).messages({
  'string.base': 'url debe ser un texto',
  'string.empty': 'url no puede estar vacía',
  'string.uri': 'url debe ser una dirección http o https válida',
  'string.uriCustomScheme': 'url debe empezar con http:// o https://',
  'string.max': 'url no puede superar los 2048 caracteres',
  'any.required': 'url es obligatoria',
});

// POST /posts  { "description": "...", "userId": "..." }
const createPostSchema = Joi.object({
  description: description.required(),
  userId: objectId.required(),
});

// PUT /posts/:id  { "description": "..." }
const updatePostSchema = Joi.object({
  description: description.required(),
});

// POST /posts/:id/images  { "url": "https://..." }
const addImageSchema = Joi.object({
  url: url.required(),
});

module.exports = {
  createPostSchema,
  updatePostSchema,
  addImageSchema,
  postIdParamSchema: idParam('id'),
  postImageParamsSchema: idParam('id', 'imageId'),
};
