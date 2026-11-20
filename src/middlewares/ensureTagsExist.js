// Verifica que existan TODAS las etiquetas de req.body.tagIds.
// Si falta alguna responde 404 con la lista de las que no existen, así no se asocia ninguna (todo o nada).

const { Tag } = require('../models');
const HttpError = require('../utils/httpError');

async function ensureTagsExist(req, res, next) {
  try {
    const { tagIds } = req.body;
    const tags = await Tag.find({ _id: { $in: tagIds } });
    if (tags.length !== tagIds.length) {
      const found = new Set(tags.map((t) => t._id.toString()));
      const missing = tagIds.filter((id) => !found.has(id));
      throw new HttpError(404, 'Hay etiquetas que no existen', { missingTagIds: missing });
    }
    req.entities = { ...(req.entities || {}), tags };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = ensureTagsExist;
