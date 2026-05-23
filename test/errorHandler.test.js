const express = require('express');
const request = require('supertest');
const AppError = require('../src/shared/errors/AppError');
const { requestIdMiddleware } = require('../src/shared/http/requestId');
const { globalErrorHandler, notFoundHandler } = require('../src/middlewares/errorHandler');

const createApp = () => {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: '1kb' }));

  app.get('/app-error', (req, res, next) => {
    next(new AppError('Tidak boleh', {
      statusCode: 403,
      code: 'FORBIDDEN',
      fields: { role: ['Tidak berhak'] },
    }));
  });

  app.get('/jwt-error', (req, res, next) => {
    const err = new Error('invalid token');
    err.name = 'JsonWebTokenError';
    next(err);
  });

  app.get('/generic-error', (req, res, next) => {
    next(new Error('DB password leaked'));
  });

  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
};

describe('globalErrorHandler', () => {
  let consoleErrorSpy;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  test('mengirim AppError sebagai envelope standar', async () => {
    const res = await request(createApp()).get('/app-error').set('x-request-id', 'req-unit');

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      message: 'Tidak boleh',
      error: {
        code: 'FORBIDDEN',
        fields: { role: ['Tidak berhak'] },
      },
      meta: { requestId: 'req-unit' },
    });
    expect(res.body.meta.timestamp).toEqual(expect.any(String));
  });

  test('menangani malformed JSON', async () => {
    const res = await request(createApp())
      .post('/missing-route')
      .set('Content-Type', 'application/json')
      .send('{"invalid"');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.message).toBe('Format JSON tidak valid');
  });

  test('menangani JWT error', async () => {
    const res = await request(createApp()).get('/jwt-error');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.message).toBe('Token tidak valid');
  });

  test('menangani payload terlalu besar', async () => {
    const res = await request(createApp())
      .post('/missing-route')
      .send({ payload: 'x'.repeat(2048) });

    expect(res.status).toBe(413);
    expect(res.body.message).toBe('Ukuran data terlalu besar. Maksimal 10MB.');
  });

  test('generic 500 tidak membocorkan pesan internal', async () => {
    const res = await request(createApp()).get('/generic-error');

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Terjadi kesalahan internal pada server');
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  test('notFoundHandler memakai envelope standar', async () => {
    const res = await request(createApp()).get('/route-tidak-ada');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.message).toBe('Route GET /route-tidak-ada tidak ditemukan');
  });
});
