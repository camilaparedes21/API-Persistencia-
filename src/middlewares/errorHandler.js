/* NOTA: el manejo global de errores lo armé porque mis endpoints necesitaban responder 400/404/409 con mensajes claros
 y poder probarlos. Se puede unificar con el definitivo al integrar.*/
// Manejo de errores centralizado. Formato: { error: string, details?: ... }

const HttpError = require('../utils/httpError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  // Id con formato inválido que llegó hasta Mongoose -> 400
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `El valor "${err.value}" no es válido para ${err.path}` });
  }

  // Validaciones del schema de Mongoose -> 400
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Índice único violado (ej.: tag o nickName repetido) -> 409
  if (err.code === 11000) {
    const [field, value] = Object.entries(err.keyValue || {})[0] || ['campo', ''];
    return res.status(409).json({ error: `Ya existe un registro con ${field} "${value}"` });
  }

  // JSON mal formado en el body -> 400
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = errorHandler;
