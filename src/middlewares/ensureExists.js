/* Verifica que exista un documento :
 Si no existe responde 404; si existe lo guarda en req.entities[attach].
 Va después de validate(), así el id ya llega con formato válido.*/


const HttpError = require('../utils/httpError');

function ensureExists({ model, from = 'params', key, label, attach }) {
  return async (req, res, next) => {
    try {
      const source = (req.validated && req.validated[from]) || req[from] || {};
      const id = source[key];
      const doc = await model.findById(id);
      if (!doc) throw new HttpError(404, `${label} con id ${id} no encontrado`);
      req.entities = { ...(req.entities || {}), [attach]: doc };
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = ensureExists;
