'use strict';

// Rutas de /posts y de sus imágenes (/posts/:id/images)
const { Router } = require('express');
const { Post, User } = require('../models');
const validate = require('../middlewares/validate');
const ensureExists = require('../middlewares/ensureExists');
const ensurePostHasImage = require('../middlewares/ensurePostHasImage');
const ctrl = require('../controllers/post.controller');
const {
  createPostSchema,
  updatePostSchema,
  addImageSchema,
  postIdParamSchema,
  postImageParamsSchema,
} = require('../schemas/post.schema');

const router = Router();

const postExists = ensureExists({ model: Post, from: 'params', key: 'id', label: 'Post', attach: 'post' });
const userExists = ensureExists({ model: User, from: 'body', key: 'userId', label: 'Usuario', attach: 'user' });
const validId = validate(postIdParamSchema, 'params');

// Publicaciones
router.get('/', ctrl.getAll);
router.get('/:id', validId, postExists, ctrl.getById);
router.post('/', validate(createPostSchema), userExists, ctrl.create);
router.put('/:id', validId, validate(updatePostSchema), postExists, ctrl.update);
router.delete('/:id', validId, postExists, ctrl.remove);

// Imágenes de una publicación
router.post('/:id/images', validId, validate(addImageSchema), postExists, ctrl.addImage);
router.delete(
  '/:id/images/:imageId',
  validate(postImageParamsSchema, 'params'),
  postExists,
  ensurePostHasImage,
  ctrl.removeImage
);

module.exports = router;
