const express = require('express');
const request = require('supertest');

jest.mock('../src/config/prisma', () => ({
  ruangKelas: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../src/middlewares/authMiddleware', () => ({
  verifyToken: (req, res, next) => next(),
  authorizeRoles: () => (req, res, next) => next(),
}));

const prisma = require('../src/config/prisma');
const { requestIdMiddleware } = require('../src/shared/http/requestId');
const { globalErrorHandler, notFoundHandler } = require('../src/middlewares/errorHandler');
const masterDataRoutes = require('../src/routes/masterDataRoutes');

const createApp = () => {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json());
  app.use('/api/master', masterDataRoutes);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
};

const validRoomId = '11111111-1111-1111-8111-111111111111';

describe('rooms route pilot module', () => {
  let consoleErrorSpy;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/master/ruang-kelas returns room DTO list', async () => {
    prisma.ruangKelas.findMany.mockResolvedValue([
      { id: validRoomId, kode: 'R-101', gedung: 'A', kapasitas: 32 },
    ]);

    const res = await request(createApp()).get('/api/master/ruang-kelas');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Data ruang kelas berhasil diambil',
      data: [
        { id: validRoomId, code: 'R-101', building: 'A', capacity: 32 },
      ],
    });
    expect(prisma.ruangKelas.findMany).toHaveBeenCalledWith({ orderBy: { kode: 'asc' } });
  });

  test('POST /api/master/ruang-kelas creates a room', async () => {
    prisma.ruangKelas.create.mockResolvedValue({
      id: validRoomId,
      kode: 'R-102',
      gedung: 'A',
      kapasitas: 30,
    });

    const res = await request(createApp())
      .post('/api/master/ruang-kelas')
      .send({ code: 'R-102', building: 'A', capacity: '30' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Ruang kelas berhasil ditambahkan',
      data: { id: validRoomId, code: 'R-102', building: 'A', capacity: 30 },
    });
    expect(prisma.ruangKelas.create).toHaveBeenCalledWith({
      data: { kode: 'R-102', gedung: 'A', kapasitas: 30 },
    });
  });

  test('POST /api/master/ruang-kelas maps duplicate code to conflict envelope', async () => {
    prisma.ruangKelas.create.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['kode'] },
    });

    const res = await request(createApp())
      .post('/api/master/ruang-kelas')
      .send({ code: 'R-102', building: 'A', capacity: 30 });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      success: false,
      error: {
        code: 'DATABASE_CONSTRAINT',
        fields: { kode: ['Sudah digunakan'] },
      },
    });
  });

  test('PUT /api/master/ruang-kelas/:id updates a room', async () => {
    prisma.ruangKelas.update.mockResolvedValue({
      id: validRoomId,
      kode: 'R-201',
      gedung: 'B',
      kapasitas: 36,
    });

    const res = await request(createApp())
      .put(`/api/master/ruang-kelas/${validRoomId}`)
      .send({ code: 'R-201', building: 'B', capacity: 36 });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      id: validRoomId,
      code: 'R-201',
      building: 'B',
      capacity: 36,
    });
    expect(prisma.ruangKelas.update).toHaveBeenCalledWith({
      where: { id: validRoomId },
      data: { kode: 'R-201', gedung: 'B', kapasitas: 36 },
    });
  });

  test('DELETE /api/master/ruang-kelas/:id deletes a room', async () => {
    prisma.ruangKelas.delete.mockResolvedValue({ id: validRoomId });

    const res = await request(createApp()).delete(`/api/master/ruang-kelas/${validRoomId}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Ruang kelas berhasil dihapus',
      data: null,
    });
    expect(prisma.ruangKelas.delete).toHaveBeenCalledWith({ where: { id: validRoomId } });
  });
});
