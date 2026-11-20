const User = require('../models/user')
const Post = require('../models/post')
const Comment = require('../models/comment')

const obtenerUsuarios = async (req, res) => {
    try{
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
    } catch(error){
        res.status(500).json({message: "Error al obtener los usuarios."})
    }
}

const obtenerUsuario = async (req, res) => {
    const usuario = req.user

    //Creamos una constante del usuario obtenido con los campos que se pueden mostrar (excluímos password)
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
    try{
        const usuario = new User(req.body)
        await usuario.save()

        //Creamos una constante del usuario creado con los campos que se pueden mostrar (excluímos password)
        const usuarioCreado = {
            _id: usuario._id,
            nickName: usuario.nickName,
            firstName: usuario.firstName,
            lastName: usuario.lastName,
            email: usuario.email
        }
        res.status(201).json(usuarioCreado)
    } catch(error){
        if(error.code === 11000){
            return res.status(409).json({message: "El nickname ya está registrado."})
        }
        res.status(500).json({message: "Error al crear el usuario:", error})
    }
}

const actualizarUsuario = async (req, res) => {
    try{
        const usuario = req.user
    
        usuario.set(req.body)
        await usuario.save()

        //Creamos una constante del usuario actualizado con los campos que se pueden mostrar (excluimos password)
        const usuarioActualizado = {
            _id: usuario._id,
            nickName: usuario.nickName,
            firstName: usuario.firstName,
            lastName: usuario.lastName,
            email: usuario.email
        }
        res.status(200).json(usuarioActualizado)
    } catch(error){
        res.status(500).json({message: "Error al actualizar el usuario."})
    }
}

const eliminarUsuario = async (req, res) => {
    try{
        const usuario = req.user
        //Elimina las publicaciones del usuario
        await Post.deleteMany({ idUser: usuario._id })
        //Elimina los comentarios del usuario
        await Comment.deleteMany({ idUser: usuario._id })
        //Elimina el usuario
        await usuario.deleteOne()
        res.status(200).json({message: "Usuario eliminado con éxito!"})
    } catch(error){
        res.status(500).json({message: "Error al eliminar el usuario."})
    }
}

const seguirUsuario = async (req, res) => {
    try{
        const { idSeguidor } = req.body
        const { idSeguido } = req.params

        //Encuentra y actualiza la lista de seguidos del seguidor
        await User.findByIdAndUpdate(idSeguidor, {
            $addToSet: { seguidos: idSeguido }
        })

        //Encuentra y actualiza la lista de seguidores del seguido
        await User.findByIdAndUpdate(idSeguido, {
            $addToSet: { seguidores: idSeguidor }
        })

        res.status(200).json({message: "Seguiste a este usuario!"})
    } catch(error){
        console.error
        res.status(500).json({message: "Error al intentar seguir al usuario."})
    }
}

module.exports = {
    obtenerUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    seguirUsuario
}