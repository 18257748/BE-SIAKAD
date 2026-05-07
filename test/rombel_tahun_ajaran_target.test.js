jest.mock('../src/config/prisma', () => ({
  tahunAjaran: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  masterKelas: {
    findUnique: jest.fn(),
  },
  rombel: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
}));

const prisma = require('../src/config/prisma');
const { getAll, create } = require('../src/controllers/rombelController');

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

describe('rombel tahun ajaran target', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAll memfilter rombel berdasarkan tahunAjaranId jika query dikirim', async () => {
    prisma.rombel.findMany.mockResolvedValue([]);

    const req = { query: { tahunAjaranId: 'ta-2026' } };
    const res = mockRes();

    await getAll(req, res);

    expect(prisma.rombel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tahun_ajaran_id: 'ta-2026' },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('create memakai tahunAjaranId dari body walaupun bukan tahun ajaran aktif', async () => {
    prisma.tahunAjaran.findUnique.mockResolvedValue({
      id: 'ta-2026',
      kode: '2026/2027',
    });
    prisma.masterKelas.findUnique.mockResolvedValue({
      wali_kelas_id: 'guru-1',
    });
    prisma.rombel.findFirst.mockResolvedValue(null);
    prisma.rombel.create.mockResolvedValue({
      id: 'rombel-2026',
      master_kelas_id: 'mk-xi-1',
      tahun_ajaran_id: 'ta-2026',
      ruang_kelas_id: 'ruang-1',
      master_kelas: { nama: 'XI-1' },
      tahun_ajaran: { kode: '2026/2027' },
      ruang_kelas: { kode: 'R-006' },
    });

    const req = {
      body: {
        masterKelasId: 'mk-xi-1',
        ruangKelasId: 'ruang-1',
        tahunAjaranId: 'ta-2026',
      },
    };
    const res = mockRes();

    await create(req, res);

    expect(prisma.tahunAjaran.findFirst).not.toHaveBeenCalled();
    expect(prisma.rombel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          master_kelas_id: 'mk-xi-1',
          ruang_kelas_id: 'ruang-1',
          tahun_ajaran_id: 'ta-2026',
        }),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.data).toMatchObject({
      id: 'rombel-2026',
      tahunAjaranId: 'ta-2026',
    });
  });

  test('create mengembalikan 404 jika tahunAjaranId tidak ditemukan', async () => {
    prisma.tahunAjaran.findUnique.mockResolvedValue(null);

    const req = {
      body: {
        masterKelasId: 'mk-xi-1',
        ruangKelasId: 'ruang-1',
        tahunAjaranId: 'ta-invalid',
      },
    };
    const res = mockRes();

    await create(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.message).toBe('Tahun Ajaran tidak ditemukan');
    expect(prisma.rombel.create).not.toHaveBeenCalled();
  });

  test('create menolak duplikasi master kelas pada tahun ajaran yang sama', async () => {
    prisma.tahunAjaran.findUnique.mockResolvedValue({
      id: 'ta-2026',
      kode: '2026/2027',
    });
    prisma.masterKelas.findUnique.mockResolvedValue({
      wali_kelas_id: null,
    });
    prisma.rombel.findFirst.mockResolvedValueOnce({
      master_kelas: { nama: 'XI-1' },
    });

    const req = {
      body: {
        masterKelasId: 'mk-xi-1',
        ruangKelasId: 'ruang-1',
        tahunAjaranId: 'ta-2026',
      },
    };
    const res = mockRes();

    await create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toBe(
      'Rombel untuk kelas ini pada tahun ajaran tersebut sudah ada',
    );
    expect(prisma.rombel.create).not.toHaveBeenCalled();
  });
});
