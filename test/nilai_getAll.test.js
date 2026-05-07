jest.mock('../src/config/prisma', () => ({
  semester: { findFirst: jest.fn() },
  rombel: { findFirst: jest.fn() },
  nilai: { findMany: jest.fn() },
}));

const prisma = require('../src/config/prisma');
const { getAll } = require('../src/controllers/nilaiController');

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

describe('Nilai getAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.semester.findFirst.mockResolvedValue({
      tahun_ajaran_id: 'ta-aktif',
    });
    prisma.rombel.findFirst.mockResolvedValue({
      siswa: [{ siswa_id: 'siswa-1' }],
    });
    prisma.nilai.findMany.mockResolvedValue([]);
  });

  test('memfilter rombel berdasarkan tahun ajaran aktif saat kelasId dipakai', async () => {
    const req = { query: { kelasId: 'kelas-1' } };
    const res = mockRes();

    await getAll(req, res);

    expect(prisma.rombel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          master_kelas_id: 'kelas-1',
          tahun_ajaran_id: 'ta-aktif',
        },
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
