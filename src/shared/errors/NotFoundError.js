const AppError = require('./AppError');

class NotFoundError extends AppError {
  constructor(message = 'Data tidak ditemukan', { details = null, fields = null } = {}) {
    super(message, {
      statusCode: 404,
      code: 'NOT_FOUND',
      details,
      fields,
    });
  }
}

module.exports = NotFoundError;
