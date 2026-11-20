'use strict';

const express = require('express');
const router = express.Router();
const db = require('../models');
const mongoose = require('mongoose');

// Crear una publicación.
router.post('/', async (req, res) => {
  try {
    const { description, userId } = req.body;

    // Valida que la descripción exista y no contenga solo espacios.
    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        error: 'La descripción es obligatoria.'
      });
    }

    // Valida que se haya enviado un ID válido de usuario.
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        error: 'El identificador del usuario es obligatorio y debe ser válido.'
      });
    }

    // Busca al usuario para comprobar que exista.
    const usuario = await db.User.findById(userId);

    if (!usuario) {
      return res.status(404).json({
        error: 'El usuario no existe.'
      });
    }

    // Guarda la publicación vinculándola con su autor.
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

// Obtener todas las publicaciones junto con sus usuarios e imágenes asociadas.
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

// Obtener una publicación específica mediante su ID.
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        error: 'El identificador de la publicación no es válido.'
      });
    }

    const publicacion = await db.Post.findById(postId)
      .populate('idUser', '-password')
      .populate('imagen');

    if (!publicacion) {
      return res.status(404).json({
        error: 'La publicación no existe.'
      });
    }

    return res.status(200).json({
      mensaje: 'Publicación obtenida correctamente.',
      publicacion
    });
  } catch (error) {
    console.error('Error al obtener la publicación:', error);

    return res.status(500).json({
      error: 'No se pudo obtener la publicación.'
    });
  }
});

// Modificar la descripción de una publicación existente.
router.put('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { description } = req.body;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        error: 'El identificador de la publicación no es válido.'
      });
    }

    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        error: 'La descripción es obligatoria y no puede estar vacía.'
      });
    }

    const publicacion = await db.Post.findById(postId);

    if (!publicacion) {
      return res.status(404).json({
        error: 'La publicación no existe.'
      });
    }

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

// Eliminar una publicación por su ID y sus imágenes asociadas.
router.delete('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        error: 'El identificador de la publicación no es válido.'
      });
    }

    const publicacion = await db.Post.findById(postId);

    if (!publicacion) {
      return res.status(404).json({
        error: 'La publicación no existe.'
      });
    }

    // Eliminamos las imágenes asociadas en la colección PostImage
    await db.PostImage.deleteMany({ idPost: publicacion._id });

    // Eliminamos la publicación
    await publicacion.deleteOne();

    return res.status(200).json({
      mensaje: 'Publicación y sus imágenes eliminadas correctamente.'
    });
  } catch (error) {
    console.error('Error al eliminar la publicación:', error);

    return res.status(500).json({
      error: 'No se pudo eliminar la publicación.'
    });
  }
});

// Agregar una imagen a una publicación existente.
router.post('/:postId/images', async (req, res) => {
  try {
    const { postId } = req.params;
    const { url } = req.body;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        error: 'El identificador de la publicación no es válido.'
      });
    }

    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({
        error: 'La URL de la imagen es obligatoria.'
      });
    }

    const publicacion = await db.Post.findById(postId);

    if (!publicacion) {
      return res.status(404).json({
        error: 'La publicación no existe.'
      });
    }

    // Creamos el documento de imagen en PostImage
    const imagen = await db.PostImage.create({
      idPost: publicacion._id,
      imageUrl: url.trim()
    });

    // Agregamos la referencia al array de imágenes del post
    publicacion.imagen.push(imagen._id);
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

// Eliminar una imagen específica de una publicación.
router.delete('/:postId/images/:imageId', async (req, res) => {
  try {
    const { postId, imageId } = req.params;

    if (!mongoose.isValidObjectId(postId) || !mongoose.isValidObjectId(imageId)) {
      return res.status(400).json({
        error: 'Los identificadores proporcionados no son válidos.'
      });
    }

    const publicacion = await db.Post.findById(postId);

    if (!publicacion) {
      return res.status(404).json({
        error: 'La publicación no existe.'
      });
    }

    const imagen = await db.PostImage.findOne({
      _id: imageId,
      idPost: publicacion._id
    });

    if (!imagen) {
      return res.status(404).json({
        error: 'La imagen no existe o no pertenece a esta publicación.'
      });
    }

    // Quitamos la referencia del array del post, guardamos y borramos la imagen
    publicacion.imagen.pull(imagen._id);
    await publicacion.save();
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