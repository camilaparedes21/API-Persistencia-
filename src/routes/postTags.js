'use strict';

// Rutas de /posts/:postId/tags
const { Router } = require('express');
const { Post, Tag } = require('../models');
const validate = require('../middlewares/validate');
const ensureExists = require('../middlewares/ensureExists');
const ensureTagsExist = require('../middlewares/ensureTagsExist');
const ensurePostHasTag = require('../middlewares/ensurePostHasTag');
const ctrl = require('../controllers/postTag.controller');
const { postIdParamSchema, assignTagsSchema, postTagParamsSchema } = require('../schemas/tag.schema');

const router = Router({ mergeParams: true });

const postExists = ensureExists({ model: Post, from: 'params', key: 'postId', label: 'Post', attach: 'post' });
const tagExists = ensureExists({ model: Tag, from: 'params', key: 'tagId', label: 'Etiqueta', attach: 'tag' });

router.get('/', validate(postIdParamSchema, 'params'), postExists, ctrl.getTagsOfPost);
router.post('/', validate(postIdParamSchema, 'params'), validate(assignTagsSchema), postExists, ensureTagsExist, ctrl.assignTags);
router.delete('/:tagId', validate(postTagParamsSchema, 'params'), postExists, tagExists, ensurePostHasTag, ctrl.removeTag);

module.exports = router;
