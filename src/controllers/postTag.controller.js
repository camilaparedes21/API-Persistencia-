// Etiquetas de un post (relación muchos a muchos).
// La relación se guarda en los dos lados: Post.tags y Tag.posts (así lo
// modeló Rocío), por eso cada operación actualiza ambos documentos.

const { Post, Tag } = require('../models');

const TAGS = { path: 'tags', select: 'name', options: { sort: { name: 1 } } };

async function tagsOfPost(postId) {
  const post = await Post.findById(postId).populate(TAGS);
  return post.tags;
}

// GET /posts/:postId/tags
async function getTagsOfPost(req, res) {
  res.json(await tagsOfPost(req.entities.post._id));
}

// POST /posts/:postId/tags  { "tagIds": [...] }
// Las etiquetas ya fueron verificadas por ensureTagsExist (todo o nada).
// $addToSet evita duplicados: reasignar una etiqueta no da error.
async function assignTags(req, res) {
  const { post, tags } = req.entities;
  const tagIds = tags.map((t) => t._id);

  await Post.updateOne({ _id: post._id }, { $addToSet: { tags: { $each: tagIds } } });
  await Tag.updateMany({ _id: { $in: tagIds } }, { $addToSet: { posts: post._id } });

  res.status(200).json(await tagsOfPost(post._id));
}

// DELETE /posts/:postId/tags/:tagId
async function removeTag(req, res) {
  const { post, tag } = req.entities;
  await Post.updateOne({ _id: post._id }, { $pull: { tags: tag._id } });
  await Tag.updateOne({ _id: tag._id }, { $pull: { posts: post._id } });
  res.status(204).send();
}

module.exports = { getTagsOfPost, assignTags, removeTag };
