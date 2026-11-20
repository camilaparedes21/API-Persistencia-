const mongoose = require('mongoose')
const { isCommentVisible } = require('../config/comments')

// Definición del esquema para los comentarios
const commentSchema = new mongoose.Schema({
    idPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true }, // Referencia al post al que pertenece el comentario
    idUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Referencia al usuario autor del comentario
    content: { type: String, required: true, trim: true}, // Texto o contenido del comentario (requerido y sin espacios vacíos extra al inicio o final)
    date: { type: Date, required: true, default: Date.now }, // Fecha en que se hizo el comentario (se usa para la regla de antigüedad)
}, {
    toJSON: { virtuals: true },   // Incluye los virtuales (isVisible) al devolver el comentario como JSON
    toObject: { virtuals: true },
    id: false,                    // Evita que se duplique _id como "id"
})

// VIRTUAL: no se guarda en la base, se calcula cada vez que se lee el comentario.
// Es true si el comentario tiene menos de COMMENT_MAX_AGE_MONTHS meses.
commentSchema.virtual('isVisible').get(function () {
    return isCommentVisible(this.date)
})

// Índice para buscar rápido los comentarios de un post filtrados por fecha
commentSchema.index({ idPost: 1, date: -1 })

module.exports = mongoose.model('Comment', commentSchema);
