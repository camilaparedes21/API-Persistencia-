const mongoose = require('mongoose');

// Definición del esquema para las publicaciones (Posts)
const postSchema = new mongoose.Schema({
    idUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Referencia al usuario dueño de la publicación (relación 1:N)
    description: { type: String, required: true, trim: true }, // Contenido principal del post
    tags: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tag' 
      }
    ], // Arreglo de IDs que apuntan a la colección de Tags (Relación Muchos a Muchos)
    imagen: [
      {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'PostImage'
      }
    ] // Arreglo de IDs que apuntan a la colección separada de imágenes
}, {
  // Fecha de la publicación: createdAt (cuándo se publicó) y updatedAt (última modificación)
  timestamps: true
})

module.exports = mongoose.model('Post', postSchema);
