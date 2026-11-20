/* Busca el usuario de /users/:id y lo deja en req.user.
 1. Valida con Joi que el id sea un ObjectId -> si no, 400.
 2. Verifica que el usuario exista -> si no, 404.
 Reutiliza validate() y ensureExists(), así los errores tienen el mismo formato
 que el resto de la API: { "error": "..." }.*/

const User = require('../models/user')
const validate = require('./validate')
const ensureExists = require('./ensureExists')
const { idParam } = require('../schemas/common.schema')

const buscarUserPorId = [
    validate(idParam('id'), 'params'),
    ensureExists({ model: User, from: 'params', key: 'id', label: 'Usuario', attach: 'user' }),
    (req, res, next) => {
        req.user = req.entities.user
        next()
    }
]

module.exports = buscarUserPorId
