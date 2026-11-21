/* Controladores de usuarios. Sólo hacen la operación: los datos ya vienen
 validados (Joi) y los usuarios ya fueron buscados por los middlewares.
 No hace falta try/catch: en Express 5, si una función async falla, el error
 llega solo al errorHandler (por ejemplo, un nickName repetido -> 409).*/

const User = require('../models/user')
const Post = require('../models/post')
const Comment = require('../models/comment')
const PostImage = require('../models/post_images')
const Tag = require('../models/tag')
const { verifyPassword } = require('../utils/password')


//Campos del usuario que se pueden mostrar (nunca la contraseña)
const datosPublicos = (usuario) => ({
    _id: usuario._id,
    nickName: usuario.nickName,
    firstName: usuario.firstName,
    lastName: usuario.lastName,
    email: usuario.email
})

const obtenerUsuarios = async (req, res) => {
    const usuarios = await User.find()
        .select("nickName firstName lastName seguidos seguidores")

    //Convierte la colección de seguidos y seguidores en solo su cantidad
    const usuariosConSeguidosYSeguidores = usuarios.map(u => ({
        _id: u._id,
        nickName: u.nickName,
        firstName: u.firstName,
        lastName: u.lastName,
        seguidores: u.seguidores.length,
        seguidos: u.seguidos.length
    }));

    res.status(200).json(usuariosConSeguidosYSeguidores)
}

const obtenerUsuario = async (req, res) => {
    const usuario = req.user

    const usuarioObtenido = {
        _id: usuario._id,
        nickName: usuario.nickName,
        firstName: usuario.firstName,
        lastName: usuario.lastName,
        seguidores: usuario.seguidores.length,
        seguidos: usuario.seguidos.length
    }
    res.status(200).json(usuarioObtenido)
}

const crearUsuario = async (req, res) => {
    //La contraseña se guarda hasheada (ver el hook pre('save') del modelo)
    const usuario = new User(req.body)
    await usuario.save()
    res.status(201).json(datosPublicos(usuario))
}

// POST /users/login -> valida nickName y contraseña
const login = async (req, res) => {
    const { nickName, password } = req.body

    if (!nickName || !password) {
        return res.status(400).json({ error: 'nickName y contraseña son obligatorios' })
    }

    // La contraseña tiene select: false, así que hay que pedirla explícitamente
    const usuario = await User.findOne({ nickName }).select('+password')

    // Mismo mensaje en los dos casos, para no revelar qué usuarios existen
    if (!usuario || !verifyPassword(password, usuario.password)) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
    }

    res.status(200).json(datosPublicos(usuario))
}

const actualizarUsuario = async (req, res) => {
    const usuario = req.user
    usuario.set(req.body)
    await usuario.save()
    res.status(200).json(datosPublicos(usuario))
}

/* MongoDB no borra en cascada, así que al eliminar un usuario se limpia todo lo relacionado:
 - Sus publicaciones, con las imágenes y los comentarios (de cualquier usuario) de esas publicaciones.
 - Esas publicaciones se quitan de las etiquetas que las tenían (Tag.posts). Las etiquetas no se borran.
 - Los comentarios que el usuario hizo en publicaciones de otros.
 - Su id en los arrays de seguidos y seguidores de los demás usuarios.*/
const eliminarUsuario = async (req, res) => {
    const usuario = req.user

    const posts = await Post.find({ idUser: usuario._id }).select('_id')
    const idsPosts = posts.map((p) => p._id)

    await PostImage.deleteMany({ idPost: { $in: idsPosts } })
    await Comment.deleteMany({ $or: [{ idUser: usuario._id }, { idPost: { $in: idsPosts } }] })
    await Tag.updateMany({ posts: { $in: idsPosts } }, { $pull: { posts: { $in: idsPosts } } })
    await Post.deleteMany({ _id: { $in: idsPosts } })

    await User.updateMany({ seguidos: usuario._id }, { $pull: { seguidos: usuario._id } })
    await User.updateMany({ seguidores: usuario._id }, { $pull: { seguidores: usuario._id } })

    await usuario.deleteOne()
    res.status(200).json({message: "Usuario eliminado con éxito!"})
}

const seguirUsuario = async (req, res) => {
    const { seguidor, seguido } = req.entities

    //Agrega al seguido en los seguidos del seguidor, y al seguidor en los seguidores del seguido
    await User.updateOne({ _id: seguidor._id }, { $addToSet: { seguidos: seguido._id } })
    await User.updateOne({ _id: seguido._id }, { $addToSet: { seguidores: seguidor._id } })

    res.status(200).json({message: "Seguiste a este usuario!"})
}

const dejarDeSeguirUsuario = async (req, res) => {
    const { seguidor, seguido } = req.entities

    //Quita la relación de los dos lados
    await User.updateOne({ _id: seguidor._id }, { $pull: { seguidos: seguido._id } })
    await User.updateOne({ _id: seguido._id }, { $pull: { seguidores: seguidor._id } })

    res.status(200).json({message: "Dejaste de seguir a este usuario."})
}

module.exports = {
    obtenerUsuarios,
    obtenerUsuario,
    crearUsuario,
    login,
    actualizarUsuario,
    eliminarUsuario,
    seguirUsuario,
    dejarDeSeguirUsuario
}
