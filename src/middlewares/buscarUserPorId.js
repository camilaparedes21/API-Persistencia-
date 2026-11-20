const mongoose = require('mongoose')
const userSchema = require('../models/user')
const postSchema = require('../models/post')
const commentSchema = require('../models/comment')

const buscarUserPorId = async(req, res, next) => {
    try{
        const { id } = req.params

        //Validamos que el id sea un formato válido
        if(!mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({message: "El ID es inválido."})
        }
        const user = await userSchema.findById(id)

        if(!user){
            return res.status(404).json({message:"Usuario no encontrado"})
        }

        req.user = user
        next()
    } catch(error){
        console.error(error)
        res.status(500).json({message: "Error al obtener el usuario"})
    }
}

module.exports= buscarUserPorId