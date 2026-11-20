/* Middleware genérico de validación con Joi.
 Uso: router.post('/', validate(createSchema), controller)
router.get('/:id', validate(idParamSchema, 'params'), controller)

 - Devuelve 400 con TODOS los errores (abortEarly: false).
 - Elimina campos no definidos en el schema (stripUnknown).
 - Deja los datos ya convertidos (ej.: "5" -> 5) en req.validated[property]
   y además reemplaza req.body por la versión limpia.
   (En Express 5 req.query es de solo lectura, por eso se usa req.validated.)*/

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property] ?? {}, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
    }

    req.validated = { ...(req.validated || {}), [property]: value };
    if (property === 'body') req.body = value;
    return next();
  };
}

module.exports = validate;
