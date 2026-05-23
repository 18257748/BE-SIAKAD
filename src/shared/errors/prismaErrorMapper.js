const AppError = require('./AppError');

const normalizeTargetFields = (target) => {
  if (Array.isArray(target)) return target;
  if (typeof target === 'string' && target.length > 0) return [target];
  return [];
};

const createFieldErrors = (fields, message) => {
  if (!fields.length) return null;
  return fields.reduce((acc, field) => {
    acc[field] = [message];
    return acc;
  }, {});
};

const mapPrismaError = (error) => {
  if (!error || !error.code) return null;

  if (error.code === 'P2002') {
    const fields = normalizeTargetFields(error.meta?.target);
    const fieldLabel = fields.length ? fields.join(', ') : 'field';
    return new AppError(`Data dengan ${fieldLabel} yang sama sudah ada (duplikasi)`, {
      statusCode: 409,
      code: 'DATABASE_CONSTRAINT',
      details: { prismaCode: error.code, target: fields },
      fields: createFieldErrors(fields, 'Sudah digunakan'),
    });
  }

  if (error.code === 'P2003') {
    const field = error.meta?.field_name || 'referensi';
    return new AppError(`Referensi ${field} tidak valid. Data terkait tidak ditemukan`, {
      statusCode: 400,
      code: 'DATABASE_CONSTRAINT',
      details: { prismaCode: error.code, field },
      fields: createFieldErrors([field], 'Referensi tidak valid'),
    });
  }

  if (error.code === 'P2025') {
    return new AppError('Data yang diminta tidak ditemukan', {
      statusCode: 404,
      code: 'NOT_FOUND',
      details: { prismaCode: error.code },
    });
  }

  return null;
};

module.exports = { mapPrismaError };
