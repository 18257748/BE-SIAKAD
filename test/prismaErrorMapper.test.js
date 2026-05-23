const AppError = require('../src/shared/errors/AppError');
const { mapPrismaError } = require('../src/shared/errors/prismaErrorMapper');

describe('prismaErrorMapper', () => {
  test('maps P2002 unique constraint', () => {
    const mapped = mapPrismaError({
      code: 'P2002',
      meta: { target: ['kode'] },
    });

    expect(mapped).toBeInstanceOf(AppError);
    expect(mapped.statusCode).toBe(409);
    expect(mapped.code).toBe('DATABASE_CONSTRAINT');
    expect(mapped.fields).toEqual({ kode: ['Sudah digunakan'] });
  });

  test('maps P2003 foreign key constraint', () => {
    const mapped = mapPrismaError({
      code: 'P2003',
      meta: { field_name: 'tahun_ajaran_id' },
    });

    expect(mapped.statusCode).toBe(400);
    expect(mapped.code).toBe('DATABASE_CONSTRAINT');
    expect(mapped.fields).toEqual({ tahun_ajaran_id: ['Referensi tidak valid'] });
  });

  test('maps P2025 record not found', () => {
    const mapped = mapPrismaError({ code: 'P2025' });

    expect(mapped.statusCode).toBe(404);
    expect(mapped.code).toBe('NOT_FOUND');
    expect(mapped.message).toBe('Data yang diminta tidak ditemukan');
  });

  test('returns null for unknown errors', () => {
    expect(mapPrismaError({ code: 'P9999' })).toBeNull();
    expect(mapPrismaError(new Error('unknown'))).toBeNull();
  });
});
