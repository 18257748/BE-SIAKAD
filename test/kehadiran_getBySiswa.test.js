jest.mock('../src/config/prisma', () => ({
  semester: { findFirst: jest.fn() },
  kehadiran: { findMany: jest.fn() },
  jurnalMengajar: { findMany: jest.fn() },
  guruMapel: { findMany: jest.fn() },
}));

const prisma = require('../src/config/prisma');
const { getBySiswa } = require('../src/controllers/kehadiranController');

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

describe('kehadiranController.getBySiswa', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.guruMapel.findMany.mockResolvedValue([]);
  });

  test('memfilter strict berdasarkan semesterId ketika dikirim', async () => {
    prisma.kehadiran.findMany.mockResolvedValue([
      {
        id: 'kehadiran-1',
        jadwal_id: 'jadwal-1',
        tanggal: '2026-05-01',
        pertemuan_ke: 1,
        status: 'HADIR',
        keterangan: null,
        topik: 'Topik 1',
        jadwal: {
          mata_pelajaran: { nama: 'Matematika' },
          master_kelas: { nama: 'X-1' },
          guru: { nama_lengkap: 'Bu Guru' },
        },
      },
    ]);
    prisma.jurnalMengajar.findMany.mockResolvedValue([]);

    const req = { params: { siswaId: 'siswa-001' }, query: { semesterId: 'sem-001' } };
    const res = mockRes();

    await getBySiswa(req, res);

    expect(prisma.kehadiran.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          siswa_id: 'siswa-001',
          semester_id: 'sem-001',
        },
      })
    );
    expect(prisma.jurnalMengajar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          semester_id: 'sem-001',
        }),
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('menggunakan semester aktif secara default dan menolak jika belum ada semester aktif', async () => {
    prisma.semester.findFirst.mockResolvedValue({ id: 'sem-active' });
    prisma.kehadiran.findMany.mockResolvedValue([
      {
        id: 'kehadiran-1',
        jadwal_id: 'jadwal-1',
        tanggal: '2026-05-01',
        pertemuan_ke: 1,
        status: 'HADIR',
        keterangan: null,
        topik: 'Topik 1',
        jadwal: {
          mata_pelajaran: { nama: 'Matematika' },
          master_kelas: { nama: 'X-1' },
          guru: { nama_lengkap: 'Bu Guru' },
        },
      },
    ]);
    prisma.jurnalMengajar.findMany.mockResolvedValue([]);

    const req = { params: { siswaId: 'siswa-001' }, query: {} };
    const res = mockRes();

    await getBySiswa(req, res);

    expect(prisma.kehadiran.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          siswa_id: 'siswa-001',
          semester_id: 'sem-active',
        },
      })
    );

    prisma.kehadiran.findMany.mockClear();
    prisma.semester.findFirst.mockResolvedValue(null);

    const resNoSemester = mockRes();
    await getBySiswa(req, resNoSemester);

    expect(resNoSemester.status).toHaveBeenCalledWith(400);
    expect(prisma.kehadiran.findMany).not.toHaveBeenCalled();
  });
});
