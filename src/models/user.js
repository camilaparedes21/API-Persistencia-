const mongoose = require('mongoose');
const { hashPassword, isHashed } = require('../utils/password');

// Definición del esquema de Usuarios para la red social
const userSchema = new mongoose.Schema({
  nickName: { type: String, required: true, unique: true, trim: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  // select: false -> la contraseña no se trae en las consultas, salvo que se pida con .select('+password')
  password: { type: String, required: true, select: false },
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
}, {
  // Aunque se haya pedido la contraseña, nunca sale en una respuesta JSON
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      return ret;
    }
  }
})

// Antes de guardar, si la contraseña es nueva o cambió, se guarda su hash (nunca el texto plano)
userSchema.pre('save', async function () {
  if (this.isModified('password') && !isHashed(this.password)) {
    this.password = hashPassword(this.password);
  }
})

module.exports = mongoose.model('User', userSchema);
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
