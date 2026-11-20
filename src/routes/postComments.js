'use strict';

// Rutas de /posts/:postId/comments
const { Router } = require('express');
const { Post, User } = require('../models');
const validate = require('../middlewares/validate');
const ensureExists = require('../middlewares/ensureExists');
const ctrl = require('../controllers/comment.controller');
const { postIdParamSchema, createCommentSchema } = require('../schemas/comment.schema');

const router = Router({ mergeParams: true });

const postExists = ensureExists({ model: Post, from: 'params', key: 'postId', label: 'Post', attach: 'post' });
const userExists = ensureExists({ model: User, from: 'body', key: 'userId', label: 'Usuario', attach: 'user' });
const validPostId = validate(postIdParamSchema, 'params');

router.get('/', validPostId, postExists, ctrl.getByPost);
router.post('/', validPostId, validate(createCommentSchema), postExists, userExists, ctrl.create);

module.exports = router;
