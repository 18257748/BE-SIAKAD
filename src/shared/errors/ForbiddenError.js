const AppError = require('./AppError');

class ForbiddenError extends AppError {
  constructor(message = 'Akses ditolak', { details = null, fields = null } = {}) {
    super(message, {
      statusCode: 403,
      code: 'FORBIDDEN',
      details,
      fields,
    });
  }
}

module.exports = ForbiddenError;
