const mongoose = require('mongoose');

// Definición del esquema de Usuarios para la red social
const userSchema = new mongoose.Schema({
  nickName: { type: String, required: true, unique: true, trim: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  seguidos: [ // Arreglo de ids que apunta a otros usuarios a los que este perfil sigue (relación muchos a muchos)
    { type: mongoose.Schema.Types.ObjectId, 
      ref: 'User'
    }
  ], 
  seguidores: [ // Arreglo de ids que apunta a otros usuarios que siguen a este perfil (relación muchos a muchos)
    {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User'
    }
  ], 
})
module.exports = mongoose.model('User', userSchema);