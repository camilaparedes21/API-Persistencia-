/* Validaciones para seguir y dejar de seguir a un usuario.
 Uso:
   validarSeguirUser({ seguir: true })   -> PUT /users/:idSeguido/seguir
   validarSeguirUser({ seguir: false })  -> PUT /users/:idSeguido/dejar-de-seguir

 - Los dos ids tienen que ser ObjectId válidos (Joi) -> 400
 - Un usuario no puede seguirse ni dejar de seguirse a sí mismo -> 400
 - Los dos usuarios tienen que existir -> 404
 - Seguir a alguien que ya se sigue -> 409
 - Dejar de seguir a alguien que no se sigue -> 400
 Si todo está bien, deja los usuarios en req.entities.seguidor y req.entities.seguido.*/

const Joi = require('joi')
const User = require('../models/user')
const validate = require('./validate')
const HttpError = require('../utils/httpError')
const { objectId, idParam } = require('../schemas/common.schema')

const seguirBodySchema = Joi.object({
    idSeguidor: objectId.required()
})

function validarSeguirUser({ seguir }) {
    const verificarUsuarios = async (req, res, next) => {
        try {
            const { idSeguidor } = req.body
            const { idSeguido } = req.params

            //Para que el usuario no se siga (ni deje de seguir) a sí mismo
            if (idSeguidor === idSeguido) {
                throw new HttpError(400, seguir
                    ? 'No se puede seguir a sí mismo.'
                    : 'No se puede dejar de seguir a sí mismo.')
            }

            //Para que ambos usuarios existan
            const [seguidor, seguido] = await Promise.all([
                User.findById(idSeguidor),
                User.findById(idSeguido)
            ])
            if (!seguidor || !seguido) {
                throw new HttpError(404, 'No se encontró uno o ambos usuarios.')
            }

            const yaLoSigue = seguidor.seguidos.some((id) => id.equals(seguido._id))

            //No se puede seguir a un usuario ya seguido
            if (seguir && yaLoSigue) {
                throw new HttpError(409, 'Ya estás siguiendo a este usuario.')
            }

            //No se puede dejar de seguir a un usuario que no se sigue
            if (!seguir && !yaLoSigue) {
                throw new HttpError(400, 'No estás siguiendo a este usuario.')
            }

            req.entities = { ...(req.entities || {}), seguidor, seguido }
            next()
        } catch (error) {
            next(error)
        }
    }

    return [
        validate(idParam('idSeguido'), 'params'),
        validate(seguirBodySchema),
        verificarUsuarios
    ]
}

module.exports = validarSeguirUser
