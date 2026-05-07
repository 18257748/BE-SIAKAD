jest.mock('../src/config/prisma', () => ({
  semester: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/prisma');
const { toggleActive } = require('../src/controllers/semesterController');

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

describe('semesterController.toggleActive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('menolak aktivasi semester jika tahun ajaran induk tidak aktif', async () => {
    prisma.semester.findUnique.mockResolvedValue({
      id: 'sem-1',
      nama: 'Semester Genap',
      is_active: false,
      tahun_ajaran: { id: 'ta-1', kode: '2025/2026', is_active: false },
    });

    const req = { params: { id: 'sem-1' } };
    const res = mockRes();

    await toggleActive(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.semester.updateMany).not.toHaveBeenCalled();
  });

  test('mengaktifkan semester secara atomik dan mematikan semester lain', async () => {
    prisma.semester.findUnique
      .mockResolvedValueOnce({
        id: 'sem-1',
        nama: 'Semester Genap',
        is_active: false,
        tahun_ajaran: { id: 'ta-1', kode: '2025/2026', is_active: true },
      })
      .mockResolvedValueOnce({
        id: 'sem-1',
        nama: 'Semester Genap',
        is_active: true,
        tahun_ajaran: { kode: '2025/2026' },
      });
    prisma.semester.updateMany.mockResolvedValue({ count: 2 });
    prisma.semester.update.mockResolvedValue({
      id: 'sem-1',
      nama: 'Semester Genap',
      is_active: true,
      tahun_ajaran: { kode: '2025/2026' },
    });
    prisma.$transaction.mockImplementation(async (ops) => ops);

    const req = { params: { id: 'sem-1' } };
    const res = mockRes();

    await toggleActive(req, res);

    expect(prisma.semester.updateMany).toHaveBeenCalledWith({ data: { is_active: false } });
    expect(prisma.semester.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sem-1' },
      data: { is_active: true },
    }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data).toMatchObject({ id: 'sem-1', isActive: true });
  });
});
