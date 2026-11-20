// Verifica que la imagen exista y pertenezca al post antes de quitarla.
// Va después de ensureExists del post. Si está, la deja en req.entities.image.

const { PostImage } = require('../models');
const HttpError = require('../utils/httpError');

async function ensurePostHasImage(req, res, next) {
  try {
    const { post } = req.entities;
    const { imageId } = req.params;
    const image = await PostImage.findOne({ _id: imageId, idPost: post._id });
    if (!image) {
      throw new HttpError(404, `La imagen ${imageId} no existe en el post ${post._id}`);
    }
    req.entities.image = image;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = ensurePostHasImage;
