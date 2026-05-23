const AppError = require('./AppError');

class ValidationError extends AppError {
  constructor(message = 'Validasi gagal', { details = null, fields = null } = {}) {
    super(message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details,
      fields,
    });
  }
}

module.exports = ValidationError;
