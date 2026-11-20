# 🌐 Anti-Social - Trabajo Práctico 2 (TP2)
**Universidad Nacional de Hurlingham (UNAHUR)**  
**Materia:** Estrategia de Persistencia (C3-2026)  
**Autor:** Gerardo Gonzalez Tulian  

---

## 🚀 Descripción del Proyecto
**Anti-Social** es una API REST backend desarrollada en Node.js y Express utilizando MongoDB (con Mongoose ODM) como base de datos NoSQL. El proyecto modela una red social minimalista, implementando una arquitectura robusta, validación de esquemas con Joi, propiedades virtuales para reglas de negocio y pruebas automatizadas con Jest y Supertest.

---

## 📂 Estructura del Proyecto
La aplicación separa la lógica de la aplicación (`src/app.js`) del punto de entrada del servidor (`src/index.js`) para facilitar las pruebas de integración y garantizar una inicialización limpia.

```text
anti-social/
├── src/
│   ├── config/       # Configuración de base de datos y reglas de negocio
│   ├── controllers/  # Controladores con la lógica de negocio
│   ├── helpers/      # Visibilidad de comentarios
│   ├── middlewares/  # Validaciones, manejo de errores y verificación de existencia
│   ├── models/       # Esquemas y modelos de Mongoose (User, Post, Comment, Tag, PostImage)
│   ├── routes/       # Enrutadores de Express (/posts, /comments, /tags, /users)
│   ├── schemas/      # Esquemas de validación con Joi
│   ├── utils/        # Error Http (se lanza y el errorhandler lo combierte en una respuesta)  
│   ├── app.js        # Configuración de Express y middlewares globales
│   └── index.js      # Punto de entrada del servidor y conexión a MongoDB
├── tests/            # Pruebas automatizadas (Jest / Supertest)
├── .env.example      # Plantilla de variables de entorno
├── package.json      # Dependencias y scripts del proyecto
└── README.md         # Documentación oficial del TP

Diseño y Justificación del Modelo Documental (MongoDB / Mongoose)
Para el almacenamiento de datos se adoptó una estrategia de modelado híbrida, optimizando el rendimiento de lectura y la coherencia con las reglas de negocio:

Imágenes (PostImage):

Decisión: Modeladas en una colección separada pero asociadas rígidamente al Post mediante referencias de tipo ObjectId.

Justificación: Permite mantener el control de las imágenes asociadas de manera limpia y escalable sin sobrecargar el documento principal.

Comentarios (Comment) y Tags (Tag):

Decisión: Se estructuraron mediante referencias (ObjectId) interconectadas con sus respectivas colecciones.

Justificación: Evita que los documentos de las publicaciones superen el límite de los 16 MB establecido por MongoDB en caso de un crecimiento masivo de interacciones.

Propiedad Virtual (isVisible):

Se implementó un campo virtual en el esquema de comentarios que calcula de manera dinámica su visibilidad en tiempo de ejecución, evaluando su antigüedad frente a la variable de configuración COMMENT_MAX_AGE_MONTHS sin alterar los datos persistidos.

Requisitos e Instalación:

Prerrequisitos:

Node.js (versión 18 o superior recomendada)
MongoDB (Instalado localmente o una instancia en la nube como MongoDB Atlas)

1. Clonar el repositorio y entrar al directorio

    git clone [https://gitea.unahur.edu.ar/Estrategia-de-persistencia-C2-2026/trabajo-practico-2-compilaporfavor.git](https://gitea.unahur.edu.ar/Estrategia-de-persistencia-C2-2026/trabajo-practico-2-compilaporfavor.git)
    
    cd trabajo-practico-2-compilaporfavor

2. Instalar dependencias

    npm install

3. De no tenerlo Configurar las variables de entorno
Crea un archivo .env en la raíz del proyecto basándote en la estructura requerida:

    PORT=3000
    MONGO_URI=mongodb://127.0.0.1:27017/red-antisocial
    COMMENT_MAX_AGE_MONTHS=6

Ejecución del Servidor
    Modo Producción:

        npm start

    Modo Desarrollo (con Nodemon):

        npm run dev

Pruebas Automatizadas
El proyecto incluye un set de pruebas de integración configuradas con Jest, Supertest y mongodb-memory-server para correr tests aislados en memoria:
    
    npm test

classDiagram
    class User {
        +ObjectId _id
        +String nickName (unique)
        +String firstName
        +String lastName
        +String email
        +String password
        +ObjectId[] seguidos
        +ObjectId[] seguidores
        +Timestamps createdAt / updatedAt
    }

    class Post {
        +ObjectId _id
        +ObjectId idUser (ref)
        +String description
        +ObjectId[] tags (ref)
        +ObjectId[] imagen (ref)
        +Timestamps createdAt / updatedAt
    }

    class PostImage {
        +ObjectId _id
        +ObjectId idPost (ref)
        +String imageUrl (unique)
    }

    class Comment {
        +ObjectId _id
        +ObjectId idPost (ref)
        +ObjectId idUser (ref)
        +String content
        +Date date
        +Boolean isVisible (virtual)
    }

    class Tag {
        +ObjectId _id
        +String name (unique)
        +ObjectId[] posts (ref)
    }

    User "1" --> "*" Post : crea
    User "1" --> "*" Comment : comenta
    User "1" --> "*" User : sigue (seguidos/seguidores)
    Post "1" --> "*" PostImage : modelo híbrido / referenciado
    Post "1" --> "*" Comment : recibe
    Post "*" --> "*" Tag : etiquetado (muchos a muchos)

Explicación del diseño documental incluido en el diagrama:

1. Colecciones principales: users, posts, comments, tags y la colección separada de PostImages.

2.Tipos de datos e Índices: Se reflejan los _id: ObjectId, los campos obligatorios y los índices únicos críticos como nickName en       usuarios, imageUrl en imágenes y name en etiquetas.

3.Embebido vs. Referenciado:

    Referenciado: Las relaciones fuertes entre colecciones (como idUser en los posts y comentarios, los arrays de tags y las referencias cruzadas de usuarios) utilizan ObjectId para evitar duplicación y superar el límite de 16 MB de MongoDB.

    Asociación de Imágenes (PostImage): Las imágenes se gestionan en una colección independiente vinculada mediante idPost pero poblada en los posts mediante un arreglo de referencias (imagen), cumpliendo el diseño híbrido de la arquitectura.
