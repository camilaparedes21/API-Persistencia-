const { Router } = require('express')
const router = Router()
const userController = require('../controllers/userController')

const buscarUserPorId = require('../middlewares/buscarUserPorId')
const validarUser = require('../middlewares/validarUser')
const validarUserUpdate = require('../middlewares/validarUserUpdate')
const validarSeguirUser = require('../middlewares/validarSeguirUser')

//Rutas de usuario
router.get('/', userController.obtenerUsuarios)
router.get('/:id', buscarUserPorId, userController.obtenerUsuario)
router.post('/', validarUser, userController.crearUsuario)
router.put('/:id', buscarUserPorId, validarUserUpdate, userController.actualizarUsuario)
router.delete('/:id', buscarUserPorId, userController.eliminarUsuario)

router.post('/login', userController.login)

//Seguidores
router.put('/:idSeguido/seguir', validarSeguirUser({ seguir: true }), userController.seguirUsuario)
router.put('/:idSeguido/dejar-de-seguir', validarSeguirUser({ seguir: false }), userController.dejarDeSeguirUsuario)

module.exports = router
