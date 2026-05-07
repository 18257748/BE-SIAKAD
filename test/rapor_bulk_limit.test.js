jest.mock('../src/config/prisma', () => ({
  semester: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  rombelSiswa: {
    findFirst: jest.fn(),
  },
  nilai: {
    findMany: jest.fn(),
  },
  kehadiran: {
    findMany: jest.fn(),
  },
  catatanAkademik: {
    findUnique: jest.fn(),
  },
}));

const prisma = require('../src/config/prisma');
const { generateBulkRapor } = require('../src/controllers/raporController');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    headersSent: false,
    status: jest.fn(function status(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function json(payload) {
      this.body = payload;
      return this;
    }),
    setHeader: jest.fn(),
  };
}

describe('generateBulkRapor limit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('menolak request lebih dari 50 siswa sebelum query berat', async () => {
    const req = {
      user: { userId: 'admin-001', role: 'Administrator' },
      body: {
        semesterId: 'semester-001',
        siswaIds: Array.from({ length: 51 }, (_, index) => `siswa-${index + 1}`),
      },
    };
    const res = mockRes();

    await generateBulkRapor(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toBe('Maksimum 50 siswa per permintaan. Gunakan batch bertahap.');
    expect(prisma.semester.findUnique).not.toHaveBeenCalled();
  });

  test('request 50 siswa tetap melewati guard limit', async () => {
    prisma.semester.findUnique.mockResolvedValue(null);

    const req = {
      user: { userId: 'admin-001', role: 'Administrator' },
      body: {
        semesterId: 'semester-001',
        siswaIds: Array.from({ length: 50 }, (_, index) => `siswa-${index + 1}`),
      },
    };
    const res = mockRes();

    await generateBulkRapor(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.message).toBe('Semester tidak ditemukan');
    expect(prisma.semester.findUnique).toHaveBeenCalled();
  });
});
