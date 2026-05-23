class AppError extends Error {
  constructor(
    message = 'Terjadi kesalahan',
    {
      statusCode = 500,
      code = 'INTERNAL_SERVER_ERROR',
      details = null,
      fields = null,
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.fields = fields;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = AppError;
