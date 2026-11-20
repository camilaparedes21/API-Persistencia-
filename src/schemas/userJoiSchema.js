const Joi = require('joi')

const userJoiSchema = Joi.object({
    nickName: Joi.string().min(4).max(15).required().messages({
        "string.empty": "El nickName no puede estar vacío",
        "string.min": "El nickName debe tener al menos 4 carácteres",
        "string.max": "El nickName no puede superar los 15 carácteres",
        "any.required": "El nickName es obligatorio"
    }),
    firstName: Joi.string().min(3).max(10).required().messages({
        "string.empty": "El nombre no puede estar vacío",
        "string.min": "El nombre debe tener al menos 3 carácteres",
        "string.max": "El nombre no puede superar los 10 carácteres",
        "any.required": "El nombre es obligatorio"
    }),
    lastName: Joi.string().min(3).max(15).required().messages({
        "string.empty": "El apellido no puede estar vacío",
        "string.min": "El apellido debe tener al menos 3 carácteres",
        "string.max": "El apellido no puede superar los 15 carácteres",
        "any.required": "El apellido es obligatorio"
    }),
    email: Joi.string().email().required().messages({
        "string.empty": "El email no puede estar vacío",
        "string.email": "Ingrese un email válido",
        "any.required": "El email es obligatorio"
    }),
    //La contraseña debe tener entre 8 y 10 carácteres, 
    // al menos una mayúscula, al menos una minúscula, 
    // al menos un número
    password: Joi.string()
        .min(8).max(10)
        .pattern(/[A-Z]/).pattern(/[a-z]/).pattern(/[0-9]/)
        .required()
        .messages({
            "string.min": "La contraseña debe tener al menos 8 carácteres.",
            "string.max": "La contraseña no puede superar los 10 carácteres.",
            "string.pattern.base": "La contraseña debe tener al menos una mayúscula, una minúscula y un número.",
            "any.required": "La contraseña es obligatoria."
        })
})

module.exports = {
    userJoiSchema
}