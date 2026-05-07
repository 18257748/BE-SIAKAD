jest.mock('../src/config/prisma', () => ({
  kehadiran: { findMany: jest.fn() },
}));

const prisma = require('../src/config/prisma');
const { getHistory } = require('../src/controllers/kehadiranController');

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

describe('Kehadiran history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('mengelompokkan riwayat berdasarkan pertemuan tanpa crash', async () => {
    prisma.kehadiran.findMany.mockResolvedValue([
      {
        jadwal_id: 'jadwal-1',
        tanggal: '2026-05-01',
        pertemuan_ke: 1,
        topik: 'Topik 1',
        siswa_id: 'siswa-1',
        status: 'HADIR',
      },
      {
        jadwal_id: 'jadwal-1',
        tanggal: '2026-05-01',
        pertemuan_ke: 1,
        topik: 'Topik 1',
        siswa_id: 'siswa-2',
        status: 'IZIN',
      },
    ]);

    const req = { params: { jadwalId: 'jadwal-1' } };
    const res = mockRes();

    await getHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      tanggal: '2026-05-01',
      pertemuanKe: 1,
      topik: 'Topik 1',
      records: [
        { siswaId: 'siswa-1', status: 'HADIR' },
        { siswaId: 'siswa-2', status: 'IZIN' },
      ],
    });
  });
});
