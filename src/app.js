'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const usersRouter = require('./routes/userRoutes');
const postsRouter = require('./routes/post');
const commentsRouter = require('./routes/comments');
const postCommentsRouter = require('./routes/postComments');
const tagsRouter = require('./routes/tags');
const postTagsRouter = require('./routes/postTags');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

// Carga el archivo swagger.yaml asegurando la ruta raíz
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rutas específicas primero
app.use('/posts/:postId/comments', postCommentsRouter);
app.use('/posts/:postId/tags', postTagsRouter);

// Rutas generales
app.use('/users', usersRouter);
app.use('/posts', postsRouter);
app.use('/comments', commentsRouter);
app.use('/tags', tagsRouter);

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    mensaje: 'Servidor de Anti-Social funcionando con MongoDB'
  });
});

// Ruta inexistente y manejo de errores (siempre al final de todas las rutas)
app.use((req, res) => {
  res.status(404).json({ error: `Ruta ${req.method} ${req.originalUrl} no encontrada` });
});
app.use(errorHandler);

module.exports = app;
