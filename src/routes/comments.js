'use strict';

// Rutas de /comments
const { Router } = require('express');
const { Comment } = require('../models');
const validate = require('../middlewares/validate');
const ensureExists = require('../middlewares/ensureExists');
const ctrl = require('../controllers/comment.controller');
const {
  listCommentsQuerySchema,
  commentIdParamSchema,
  updateCommentSchema,
} = require('../schemas/comment.schema');

const router = Router();

const commentExists = ensureExists({ model: Comment, from: 'params', key: 'id', label: 'Comentario', attach: 'comment' });
const validId = validate(commentIdParamSchema, 'params');

router.get('/', validate(listCommentsQuerySchema, 'query'), ctrl.getAll);
router.get('/:id', validId, commentExists, ctrl.getById);
router.put('/:id', validId, validate(updateCommentSchema), commentExists, ctrl.update);
router.delete('/:id', validId, commentExists, ctrl.remove);

module.exports = router;
