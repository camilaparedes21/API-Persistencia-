const validate = require('./validate')
const { userJoiSchema } = require('../schemas/userJoiSchema')

const validarUser = validate(userJoiSchema)

module.exports = validarUser