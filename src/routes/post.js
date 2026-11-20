'use strict';

const express = require('express');
const router = express.Router();

const db = require('../models');

const mongoose = require('mongoose');

// Comentarios visibles (menos de COMMENT_MAX_AGE_MONTHS meses) para el detalle del post
const { findVisibleComments } = require('../helpers/commentVisibility');

// POST /posts
// Crea una nueva publicación.
router.post('/', async (req, res) => {
  try {
    // Recibimos los datos enviados desde Postman.
    const { description, userId } = req.body;

    // Validamos que la descripción sea obligatoria.
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        error: 'La descripción de la publicación es obligatoria.'
      });
    }

    // Validamos que se haya enviado un identificador de usuario.
    if (typeof userId !== 'string' || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        error: 'El identificador del usuario no es válido.'
      });
    }

    // Comprobamos que el usuario exista.
    const usuario = await db.User.findById(userId);

    if (!usuario) {
      return res.status(404).json({
        error: 'El usuario no existe.'
      });
    }

    // Creamos la publicación asociándola con el usuario.
    const publicacion = await db.Post.create({
     description: description.trim(),
     idUser: usuario._id
    });
    return res.status(201).json({
      mensaje: 'Publicación creada correctamente.',
      publicacion
    });

  } catch (error) {
    console.error('Error al crear la publicación:', error);

    return res.status(500).json({
      error: 'No se pudo crear la publicación.'
    });
  }
});

// GET /posts
// Obtiene todas las publicaciones con sus usuarios e imágenes.
router.get('/', async (req, res) => {
  try {
    const publicaciones = await db.Post.find()
      .populate('idUser', '-password')
      .populate('imagen');

    return res.status(200).json({
      mensaje: 'Publicaciones obtenidas correctamente.',
      publicaciones
    });

  } catch (error) {
    console.error('Error al obtener las publicaciones:', error);

    return res.status(500).json({
      error: 'No se pudieron obtener las publicaciones.'
    });
  }
});

// GET /posts/:id
// Obtiene una publicación específica.
router.get('/:id', async (req, res) => {
  try {
    // Recuperamos el identificador enviado en la URL.
    const { id } = req.params;

    // Validamos que el identificador sea correcto.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: 'El identificador de la publicación no es válido.'
      });
    }

    // Buscamos la publicación en MongoDB.
    const publicacion = await db.Post.findById(id)
        .populate('idUser', '-password')
        .populate('imagen')
        .populate('tags', 'name');

    // Comprobamos que la publicación exista.
    if (!publicacion) {
      return res.status(404).json({
        error: 'La publicación no existe.'
      });
    }

    // Sólo los comentarios visibles: se filtran en la consulta por fecha,
    // con la misma fecha límite que usa el virtual isVisible.
    const comentarios = await findVisibleComments(publicacion._id);

    return res.status(200).json({
      mensaje: 'Publicación obtenida correctamente.',
      publicacion: { ...publicacion.toJSON(), comentarios }
    });

  } catch (error) {
    console.error('Error al obtener la publicación:', error);

    return res.status(500).json({
      error: 'No se pudo obtener la publicación.'
    });
  }
});

// PUT /posts/:id
// Modifica la descripción de una publicación.
router.put('/:id', async (req, res) => {
  try {
    // Recuperamos el identificador de la URL.
    const { id } = req.params;

    // Recuperamos la nueva descripción.
    const { description } = req.body;

    // Validamos el identificador.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: 'El identificador de la publicación no es válido.'
      });
    }

    // Validamos la descripción.
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        error: 'La descripción de la publicación es obligatoria.'
      });
    }

    // Buscamos la publicación.
    const publicacion = await db.Post.findById(id);

    if (!publicacion) {
      return res.status(404).json({
        error: 'La publicación no existe.'
      });
    }

    // Actualizamos la descripción.
    publicacion.description = description.trim();

    await publicacion.save();

    return res.status(200).json({
      mensaje: 'Publicación actualizada correctamente.',
      publicacion
    });

  } catch (error) {
    console.error('Error al actualizar la publicación:', error);

    return res.status(500).json({
      error: 'No se pudo actualizar la publicación.'
    });
  }
});

// DELETE /posts/:id
// Elimina una publicación y todas sus imágenes asociadas.
router.delete('/:id', async (req, res) => {
  try {
    // Recuperamos el identificador de la URL.
    const { id } = req.params;

    // Validamos el identificador de la publicación.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: 'El identificador de la publicación no es válido.'
      });
    }

    // Buscamos la publicación.
    const publicacion = await db.Post.findById(id);

    if (!publicacion) {
      return res.status(404).json({
        error: 'La publicación no existe.'
      });
    }

    // Eliminamos todas las imágenes asociadas a la publicación.
    await db.PostImage.deleteMany({
      idPost: publicacion._id
    });

    // MongoDB no borra en cascada: borramos sus comentarios
    // y lo sacamos de las etiquetas que lo tenían (Tag.posts).
    await db.Comment.deleteMany({ idPost: publicacion._id });
    await db.Tag.updateMany(
      { posts: publicacion._id },
      { $pull: { posts: publicacion._id } }
    );

    // Eliminamos la publicación.
    await publicacion.deleteOne();

    return res.status(200).json({
      mensaje: 'Publicación, sus imágenes y sus comentarios eliminados correctamente.',
      publicacion
    });

  } catch (error) {
    console.error('Error al eliminar la publicación:', error);

    return res.status(500).json({
      error: 'No se pudo eliminar la publicación.'
    });
  }
});

// POST /posts/:id/images
// Agrega una imagen a una publicación.
router.post('/:id/images', async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body;

    // Validamos el identificador de la publicación.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: 'El identificador de la publicación no es válido.'
      });
    }

    // Validamos la URL.
    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({
        error: 'La URL de la imagen es obligatoria.'
      });
    }

    // Buscamos la publicación.
    const publicacion = await db.Post.findById(id);

    if (!publicacion) {
      return res.status(404).json({
        error: 'La publicación no existe.'
      });
    }

    // Creamos el documento de imagen.
    const imagen = await db.PostImage.create({
      idPost: publicacion._id,
      imageUrl: url.trim()
    });

    // Asociamos el ID de la imagen a la publicación.
    publicacion.imagen.push(imagen._id);

    // Guardamos los cambios.
    await publicacion.save();

    return res.status(201).json({
      mensaje: 'Imagen agregada correctamente.',
      imagen,
      publicacion
    });

  } catch (error) {
    console.error('Error al agregar la imagen:', error);

    return res.status(500).json({
      error: 'No se pudo agregar la imagen.'
    });
  }
});

 // DELETE /posts/:id/images/:imageId
 // Elimina una imagen específica de una publicación.
router.delete('/:id/images/:imageId', async (req, res) => {
  try {
    // Recuperamos los identificadores de la URL.
    const { id, imageId } = req.params;

    // Validamos el identificador de la publicación.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: 'El identificador de la publicación no es válido.'
      });
    }

    // Validamos el identificador de la imagen.
    if (!mongoose.isValidObjectId(imageId)) {
      return res.status(400).json({
        error: 'El identificador de la imagen no es válido.'
      });
    }

    // Buscamos la publicación.
    const publicacion = await db.Post.findById(id);

    if (!publicacion) {
      return res.status(404).json({
        error: 'La publicación no existe.'
      });
    }

    // Buscamos la imagen que pertenece a esa publicación.
    const imagen = await db.PostImage.findOne({
      _id: imageId,
      idPost: publicacion._id
    });

    if (!imagen) {
      return res.status(404).json({
        error: 'La imagen no existe en esta publicación.'
      });
    }

    // Eliminamos la referencia de la imagen en la publicación.
    publicacion.imagen.pull(imagen._id);

    // Guardamos los cambios en la publicación.
    await publicacion.save();

    // Eliminamos el documento de imagen.
    await imagen.deleteOne();

    return res.status(200).json({
      mensaje: 'Imagen eliminada correctamente.',
      publicacion
    });

  } catch (error) {
    console.error('Error al eliminar la imagen:', error);

    return res.status(500).json({
      error: 'No se pudo eliminar la imagen.'
    });
  }
});

module.exports = router;
