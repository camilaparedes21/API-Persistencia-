const Joi = require('joi');

// Un ObjectId de MongoDB: 24 caracteres hexadecimales.
// Así un id mal formado (ej.: "abc") responde 400 antes de llegar a la base.
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
  'string.base': '{#label} debe ser un texto',
  'string.empty': '{#label} no puede estar vacío',
  'string.pattern.base': '{#label} no es un id válido',
  'any.required': '{#label} es obligatorio',
});

const idParam = (...names) =>
  Joi.object(Object.fromEntries(names.map((n) => [n, objectId.required()])));

module.exports = { objectId, idParam };
