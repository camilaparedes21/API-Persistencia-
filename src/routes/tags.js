'use strict';

// Rutas de /tags
const { Router } = require('express');
const { Tag } = require('../models');
const validate = require('../middlewares/validate');
const ensureExists = require('../middlewares/ensureExists');
const ctrl = require('../controllers/tag.controller');
const { createTagSchema, updateTagSchema, tagIdParamSchema } = require('../schemas/tag.schema');

const router = Router();

const tagExists = ensureExists({ model: Tag, from: 'params', key: 'id', label: 'Etiqueta', attach: 'tag' });
const validId = validate(tagIdParamSchema, 'params');

router.get('/', ctrl.getAll);
router.get('/:id', validId, tagExists, ctrl.getById);
router.post('/', validate(createTagSchema), ctrl.create);
router.put('/:id', validId, validate(updateTagSchema), tagExists, ctrl.update);
router.delete('/:id', validId, tagExists, ctrl.remove);

module.exports = router;
