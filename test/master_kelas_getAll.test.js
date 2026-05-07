jest.mock('../src/config/prisma', () => ({
  tahunAjaran: { findFirst: jest.fn() },
  masterKelas: { findMany: jest.fn() },
  rombel: { findMany: jest.fn() },
}));

const prisma = require('../src/config/prisma');
const { getAll } = require('../src/controllers/masterKelasController');

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

describe('masterKelasController.getAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('mengambil wali kelas dan ruang dari rombel aktif, bukan dari master kelas', async () => {
    prisma.tahunAjaran.findFirst.mockResolvedValue({ id: 'ta-aktif' });
    prisma.masterKelas.findMany.mockResolvedValue([
      { id: 'mk-1', nama: 'X-1', tingkat: 'Kelas 10' },
    ]);
    prisma.rombel.findMany.mockResolvedValue([
      {
        master_kelas_id: 'mk-1',
        wali_kelas_id: 'guru-1',
        ruang_kelas_id: 'ruang-1',
        wali_kelas: { nama_lengkap: 'Wali Rombel' },
        ruang_kelas: { kode: 'R-01' },
      },
    ]);

    const res = mockRes();
    await getAll({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.data[0]).toMatchObject({
      id: 'mk-1',
      name: 'X-1',
      grade: 'Kelas 10',
      homeroomTeacher: 'Wali Rombel',
      homeroomTeacherId: 'guru-1',
      classroom: 'R-01',
      classroomId: 'ruang-1',
    });
  });
});
