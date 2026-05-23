const express = require('express');
const request = require('supertest');

jest.mock('../src/config/prisma', () => ({
  semester: {
    findFirst: jest.fn(),
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
const dashboardRoutes = require('../src/routes/dashboardRoutes');

const createApp = () => {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json());
  app.use('/api/master', masterDataRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
};

describe('active semester aliases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.semester.findFirst.mockResolvedValue({
      id: 'sem-aktif',
      nama: 'Semester Ganjil',
      tahun_ajaran: { kode: '2026/2027' },
    });
  });

  test('master and dashboard active-semester endpoints return the same data', async () => {
    const app = createApp();

    const [masterResponse, dashboardResponse] = await Promise.all([
      request(app).get('/api/master/active-semester'),
      request(app).get('/api/dashboard/active-semester'),
    ]);

    expect(masterResponse.status).toBe(200);
    expect(dashboardResponse.status).toBe(200);
    expect(masterResponse.body.data).toEqual({
      id: 'sem-aktif',
      nama: 'Semester Ganjil',
      tahunAjaran: '2026/2027',
      label: 'Semester Ganjil - 2026/2027',
    });
    expect(dashboardResponse.body.data).toEqual(masterResponse.body.data);
  });
});
