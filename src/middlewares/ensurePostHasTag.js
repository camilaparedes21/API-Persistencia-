// Verifica que el post tenga asignada la etiqueta antes de quitarla.
// Va después de ensureExists del post y del tag.

const HttpError = require('../utils/httpError');

function ensurePostHasTag(req, res, next) {
  const { post, tag } = req.entities;
  const hasTag = post.tags.some((id) => id.equals(tag._id));
  if (!hasTag) {
    return next(new HttpError(404, `El post ${post._id} no tiene asignada la etiqueta ${tag._id}`));
  }
  return next();
}

module.exports = ensurePostHasTag;
