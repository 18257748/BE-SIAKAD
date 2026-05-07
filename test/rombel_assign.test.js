jest.mock('../src/config/prisma', () => ({
  rombel: {
    findUnique: jest.fn(),
  },
  rombelSiswa: {
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
}));

const prisma = require('../src/config/prisma');
const { assignSiswa } = require('../src/controllers/rombelController');

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

describe('Rombel assignSiswa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('menolak siswa yang sudah terdaftar di rombel lain pada tahun ajaran yang sama', async () => {
    prisma.rombel.findUnique.mockResolvedValue({
      id: 'rombel-target',
      tahun_ajaran_id: 'ta-001',
      ruang_kelas: { kode: 'R-101', kapasitas: 36 },
      _count: { siswa: 10 },
    });
    prisma.rombelSiswa.findMany.mockImplementation(({ where }) => {
      if (where?.rombel_id?.not) {
        return Promise.resolve([
          {
            siswa: { id: 'siswa-001', nama_lengkap: 'Aulia', nomor_induk: '001' },
            rombel: { id: 'rombel-lain', master_kelas: { nama: 'X-2' } },
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const req = {
      params: { id: 'rombel-target' },
      body: { siswaIds: ['siswa-001', 'siswa-002'] },
    };
    const res = mockRes();

    await assignSiswa(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.rombelSiswa.createMany).not.toHaveBeenCalled();
    expect(res.body.data[0]).toMatchObject({
      siswaId: 'siswa-001',
      siswaName: 'Aulia',
      className: 'X-2',
    });
  });

  test('mengabaikan siswa yang sudah ada di rombel target dan hanya menambah siswa baru', async () => {
    prisma.rombel.findUnique.mockResolvedValue({
      id: 'rombel-target',
      tahun_ajaran_id: 'ta-001',
      ruang_kelas: { kode: 'R-101', kapasitas: 12 },
      _count: { siswa: 10 },
    });
    prisma.rombelSiswa.findMany.mockImplementation(({ where }) => {
      if (where?.rombel_id === 'rombel-target') {
        return Promise.resolve([{ siswa_id: 'siswa-001' }]);
      }
      return Promise.resolve([]);
    });
    prisma.rombelSiswa.createMany.mockResolvedValue({ count: 1 });

    const req = {
      params: { id: 'rombel-target' },
      body: { siswaIds: ['siswa-001', 'siswa-002'] },
    };
    const res = mockRes();

    await assignSiswa(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(prisma.rombelSiswa.createMany).toHaveBeenCalledWith({
      data: [
        { rombel_id: 'rombel-target', siswa_id: 'siswa-002' },
      ],
      skipDuplicates: true,
    });
    expect(res.body.message).toContain('1 siswa');
  });
});
