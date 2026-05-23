// src/middlewares/errorHandler.js
// ═══════════════════════════════════════════════
// CENTRALIZED ERROR HANDLING MIDDLEWARE
// Catches async errors & Prisma errors gracefully
// ═══════════════════════════════════════════════

const { asyncHandler } = require('../shared/http/asyncHandler');
const { buildMeta } = require('../shared/http/response');
const AppError = require('../shared/errors/AppError');
const { mapPrismaError } = require('../shared/errors/prismaErrorMapper');

const sendError = (res, err) => {
  const statusCode = err.statusCode || err.status || 500;
  const code = statusCode === 500 && !err.isOperational
    ? 'INTERNAL_SERVER_ERROR'
    : err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const message = statusCode === 500 && !err.isOperational
    ? 'Terjadi kesalahan internal pada server'
    : err.message || 'Terjadi kesalahan';

  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details: err.details || null,
      fields: err.fields || null,
    },
    meta: buildMeta(res),
  });
};

/**
 * Global Error Handler Middleware
 * 
 * Must be registered LAST in Express middleware chain.
 * Handles:
 * - Prisma Client errors (P2002, P2003, P2025, etc.)
 * - JSON parse errors
 * - Generic errors
 */
const globalErrorHandler = (err, req, res, next) => {
  // Already sent response
  if (res.headersSent) {
    return next(err);
  }

  // Log the error
  console.error(`\n  ❌ Error [${req.method} ${req.originalUrl}]:`, err.message || err);

  const mappedPrismaError = mapPrismaError(err);
  if (mappedPrismaError) {
    return sendError(res, mappedPrismaError);
  }

  if (err.name === 'PrismaClientValidationError') {
    return sendError(res, new AppError('Data yang dikirim tidak sesuai format yang diharapkan', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    }));
  }

  if (err.type === 'entity.parse.failed') {
    return sendError(res, new AppError('Format JSON tidak valid', {
      statusCode: 400,
      code: 'BAD_REQUEST',
    }));
  }

  if (err.name === 'JsonWebTokenError') {
    return sendError(res, new AppError('Token tidak valid', {
      statusCode: 401,
      code: 'UNAUTHORIZED',
    }));
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, new AppError('Token sudah kadaluarsa. Silakan login kembali.', {
      statusCode: 401,
      code: 'UNAUTHORIZED',
    }));
  }

  if (err.type === 'entity.too.large') {
    return sendError(res, new AppError('Ukuran data terlalu besar. Maksimal 10MB.', {
      statusCode: 413,
      code: 'BAD_REQUEST',
    }));
  }

  if (err instanceof AppError || err.statusCode || err.status) {
    return sendError(res, err);
  }

  return sendError(res, new AppError('Terjadi kesalahan internal pada server'));
};

/**
 * Not Found Handler (404)
 * 
 * Catches requests that don't match any route.
 * Should be placed AFTER all route definitions.
 */
const notFoundHandler = (req, res) => {
  return sendError(res, new AppError(`Route ${req.method} ${req.originalUrl} tidak ditemukan`, {
    statusCode: 404,
    code: 'NOT_FOUND',
  }));
};

module.exports = { asyncHandler, globalErrorHandler, notFoundHandler, sendError };
