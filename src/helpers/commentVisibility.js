
/* El virtual "isVisible" se calcula en JavaScript DESPUÉS de traer los datos,
así que no sirve para filtrar en la base. Para que no lleguen los comentarios
viejos se filtra en la consulta por el campo "date". Los dos usan la misma
fecha límite (getVisibilityCutoff), así que siempre coinciden.*/

const { getVisibilityCutoff } = require('../config/comments');

function visibleCommentsFilter() {
  return { date: { $gte: getVisibilityCutoff() } };
}

function hiddenCommentsFilter() {
  return { date: { $lt: getVisibilityCutoff() } };
}

/*Comentarios visibles de un post, con su autor (sólo nickName), del más nuevo
 al más viejo. Lo puede usar el GET /posts/:id:

   const { findVisibleComments } = require('../helpers/commentVisibility');
   const comments = await findVisibleComments(post._id);
   res.json({ ...post.toJSON(), comments });*/
function findVisibleComments(postId) {
  const { Comment } = require('../models'); // require acá para evitar dependencias circulares
  return Comment.find({ idPost: postId, ...visibleCommentsFilter() })
    .populate('idUser', 'nickName')
    .sort({ date: -1 });
}

module.exports = {
  visibleCommentsFilter,
  hiddenCommentsFilter,
  findVisibleComments,
};
