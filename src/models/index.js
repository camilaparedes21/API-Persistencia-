'use strict';

const User = require('./user');
const Post = require('./post');
const Comment = require('./comment');
const Tag = require('./tag');
const PostImage = require('./post_images');

// Exportamos todos los modelos juntos para que las rutas los puedan usar como `db.User`, etc.
module.exports = {
  User,
  Post,
  Comment,
  Tag,
  PostImage
};