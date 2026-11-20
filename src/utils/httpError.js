/* Error con código HTTP. Los controladores lo lanzan y el errorHandler
 global lo convierte en una respuesta*/
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

module.exports = HttpError;
