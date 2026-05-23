const AppError = require('./AppError');

class ConflictError extends AppError {
  constructor(message = 'Data konflik', { details = null, fields = null } = {}) {
    super(message, {
      statusCode: 409,
      code: 'CONFLICT',
      details,
      fields,
    });
  }
}

module.exports = ConflictError;
