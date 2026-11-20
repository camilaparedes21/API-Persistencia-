const Joi = require('joi')

const userUpdateSchema = Joi.object({
    firstName: Joi.string().min(3).max(10).messages({
            "string.empty": "El nombre no puede estar vacío",
            "string.min": "El nombre debe tener al menos 3 carácteres",
            "string.max": "El nombre no puede superar los 10 carácteres"
        }),
        lastName: Joi.string().min(3).max(15).messages({
            "string.empty": "El apellido no puede estar vacío",
            "string.min": "El apellido debe tener al menos 3 carácteres",
            "string.max": "El apellido no puede superar los 15 carácteres",
        }),
        email: Joi.string().email().messages({
            "string.empty": "El email no puede estar vacío",
            "string.email": "Ingrese un email válido",
        }),
        //La contraseña debe tener entre 8 y 10 carácteres, 
        // al menos una mayúscula, al menos una minúscula, 
        // al menos un número
        password: Joi.string()
            .min(8).max(10)
            .pattern(/[A-Z]/).pattern(/[a-z]/).pattern(/[0-9]/)
            .messages({
                "string.min": "La contraseña debe tener al menos 8 carácteres",
                "string.max": "La contraseña debe tener hasta 10 carácteres",
                "string.pattern.base": "La contraseña debe tener al menos una mayúscula, una minúscula y un número"
            })
    //Para validar que sí o sí se actualice algún campo
    }).or('firstName', 'lastName', 'email', 'password')

module.exports = {
    userUpdateSchema
}