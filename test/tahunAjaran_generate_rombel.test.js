jest.mock('../src/config/prisma', () => ({
  tahunAjaran: {
    findUnique: jest.fn(),
  },
  masterKelas: {
    findMany: jest.fn(),
  },
  rombel: {
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
}));

const prisma = require('../src/config/prisma');
const { generateRombel } = require('../src/controllers/tahunAjaranController');

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

describe('tahunAjaranController.generateRombel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('membuat rombel hanya untuk master kelas yang belum ada di tahun ajaran target', async () => {
    prisma.tahunAjaran.findUnique.mockResolvedValue({
      id: 'ta-2026',
      kode: '2026/2027',
      deskripsi: 'Tahun Ajaran 2026/2027',
      is_active: false,
    });
    prisma.masterKelas.findMany.mockResolvedValue([
      { id: 'mk-1', nama: 'X-1' },
      { id: 'mk-2', nama: 'X-2' },
      { id: 'mk-3', nama: 'XI-1' },
    ]);
    prisma.rombel.findMany.mockResolvedValue([
      { master_kelas_id: 'mk-1' },
    ]);
    prisma.rombel.createMany.mockResolvedValue({ count: 2 });

    const req = { params: { id: 'ta-2026' } };
    const res = mockRes();

    await generateRombel(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(prisma.rombel.createMany).toHaveBeenCalledWith({
      data: [
        {
          master_kelas_id: 'mk-2',
          tahun_ajaran_id: 'ta-2026',
          wali_kelas_id: null,
          ruang_kelas_id: null,
        },
        {
          master_kelas_id: 'mk-3',
          tahun_ajaran_id: 'ta-2026',
          wali_kelas_id: null,
          ruang_kelas_id: null,
        },
      ],
      skipDuplicates: true,
    });
    expect(res.body.data).toMatchObject({
      tahunAjaranId: 'ta-2026',
      tahunAjaranCode: '2026/2027',
      totalMasterKelas: 3,
      rombelDibuat: 2,
    });
  });

  test('tidak membuat duplikat jika semua rombel sudah ada', async () => {
    prisma.tahunAjaran.findUnique.mockResolvedValue({
      id: 'ta-2026',
      kode: '2026/2027',
      deskripsi: 'Tahun Ajaran 2026/2027',
      is_active: false,
    });
    prisma.masterKelas.findMany.mockResolvedValue([
      { id: 'mk-1', nama: 'X-1' },
      { id: 'mk-2', nama: 'X-2' },
    ]);
    prisma.rombel.findMany.mockResolvedValue([
      { master_kelas_id: 'mk-1' },
      { master_kelas_id: 'mk-2' },
    ]);

    const req = { params: { id: 'ta-2026' } };
    const res = mockRes();

    await generateRombel(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(prisma.rombel.createMany).not.toHaveBeenCalled();
    expect(res.body.data).toMatchObject({
      rombelDibuat: 0,
    });
  });
});
