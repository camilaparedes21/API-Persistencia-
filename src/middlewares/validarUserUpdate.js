const validate = require('./validate')
const { userUpdateSchema } = require('../schemas/userUpdateSchema')

const validarUserUpdate = validate(userUpdateSchema)

module.exports = validarUserUpdate