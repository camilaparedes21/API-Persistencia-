const mongoose = require('mongoose')
const User = require('../models/user')

const validarSeguirUsuario = async (req, res, next) =>{
    try{
        //El id del usuario seguidor viene del body
        const { idSeguidor } = req.body

        //El id del usuario a seguir viene del parámetro
        const { idSeguido } = req.params

        //Se validan ambos id
        if(!mongoose.Types.ObjectId.isValid(idSeguidor) || (!mongoose.Types.ObjectId.isValid(idSeguido))){
            return res.status(400).json({message: "Error al validar uno o ambos id."})
        }

        //Para que el usuario no se siga a sí mismo
        if(idSeguidor === idSeguido){
            return res.status(400).json({message: "No se puede seguir a sí mismo."})
        }

        //Para que ambos usuarios existan
        const usuarioSeguidor = await User.findById(idSeguidor)
        const usuarioSeguido = await User.findById(idSeguido)
        if(!usuarioSeguidor || !usuarioSeguido){
            return res.status(404).json({message: "Error al encontrar uno o ambos usuarios."})
        }

        //Para que no se pueda seguir a un usuario ya seguido
        if (usuarioSeguidor.seguidos.includes(idSeguido)) {
            return res.status(400).json({ message: "Ya estás siguiendo a este usuario." });
        }

        next()
    } catch(error){
        res.status(500).json({message: "Error al validar los usuarios."})
    }
}

module.exports = validarSeguirUsuario