const mongoose = require('mongoose')

const postimageSchema = new mongoose.Schema({
    idPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    imageUrl: { type: String, required: true, unique: true, trim: true },
})

module.exports = mongoose.model('PostImage', postimageSchema)
