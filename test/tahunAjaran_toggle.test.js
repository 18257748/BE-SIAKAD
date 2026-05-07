jest.mock('../src/config/prisma', () => ({
  tahunAjaran: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  semester: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/prisma');
const { toggleActive } = require('../src/controllers/tahunAjaranController');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status: jest.fn(function status(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function json(payload) {
      this.body = payload;
      return this;
    }),
  };
}

describe('tahunAjaranController.toggleActive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('mematikan seluruh semester saat tahun ajaran baru diaktifkan', async () => {
    prisma.tahunAjaran.findUnique.mockResolvedValue({
      id: 'ta-1',
      kode: '2026/2027',
      deskripsi: 'Tahun Ajaran 2026/2027',
      is_active: false,
    });
    prisma.tahunAjaran.updateMany.mockResolvedValue({ count: 2 });
    prisma.semester.updateMany.mockResolvedValue({ count: 4 });
    prisma.tahunAjaran.update.mockResolvedValue({
      id: 'ta-1',
      kode: '2026/2027',
      deskripsi: 'Tahun Ajaran 2026/2027',
      is_active: true,
    });
    prisma.$transaction.mockImplementation(async (fn) => fn({
      tahunAjaran: prisma.tahunAjaran,
      semester: prisma.semester,
    }));

    const req = { params: { id: 'ta-1' } };
    const res = mockRes();

    await toggleActive(req, res);

    expect(prisma.tahunAjaran.updateMany).toHaveBeenCalledWith({ data: { is_active: false } });
    expect(prisma.semester.updateMany).toHaveBeenCalledWith({ data: { is_active: false } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data).toMatchObject({ id: 'ta-1', isActive: true });
  });

  test('menonaktifkan semester yang masih terkait saat tahun ajaran dimatikan', async () => {
    prisma.tahunAjaran.findUnique.mockResolvedValue({
      id: 'ta-2',
      kode: '2025/2026',
      deskripsi: 'Tahun Ajaran 2025/2026',
      is_active: true,
    });
    prisma.semester.updateMany.mockResolvedValue({ count: 2 });
    prisma.tahunAjaran.update.mockResolvedValue({
      id: 'ta-2',
      kode: '2025/2026',
      deskripsi: 'Tahun Ajaran 2025/2026',
      is_active: false,
    });
    prisma.$transaction.mockImplementation(async (fn) => fn({
      tahunAjaran: prisma.tahunAjaran,
      semester: prisma.semester,
    }));

    const req = { params: { id: 'ta-2' } };
    const res = mockRes();

    await toggleActive(req, res);

    expect(prisma.semester.updateMany).toHaveBeenCalledWith({
      where: { tahun_ajaran_id: 'ta-2' },
      data: { is_active: false },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data).toMatchObject({ id: 'ta-2', isActive: false });
  });
});
