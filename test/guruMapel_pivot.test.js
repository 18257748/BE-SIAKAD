jest.mock('../src/config/prisma', () => ({
  masterKelas: { findMany: jest.fn() },
  guruMapel: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  semester: { findFirst: jest.fn() },
  jadwalPelajaran: { updateMany: jest.fn() },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/prisma');
const guruMapelController = require('../src/controllers/guruMapelController');

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

function buildTx() {
  return {
    guruMapel: {
      create: jest.fn(),
      update: jest.fn(),
    },
    guruMapelKelas: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    semester: {
      findFirst: jest.fn(),
    },
    jadwalPelajaran: {
      updateMany: jest.fn(),
    },
  };
}

function mockTransaction(tx) {
  prisma.$transaction.mockImplementation(async (callback) => callback(tx));
}

describe('guruMapelController pivot migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.masterKelas.findMany.mockResolvedValue([
      { id: 'kelas-1', nama: 'X IPA 1' },
      { id: 'kelas-2', nama: 'X IPA 2' },
    ]);
    prisma.guruMapel.findMany.mockResolvedValue([]);
  });

  test('create menerima masterKelasIds dan menulis pivot relasi', async () => {
    const tx = buildTx();
    mockTransaction(tx);
    tx.guruMapel.create.mockResolvedValue({
      id: 'gm-1',
      guru: { nama_lengkap: 'Guru 1' },
      mata_pelajaran: { nama: 'Matematika' },
      jam_per_minggu: 6,
    });
    tx.guruMapelKelas.createMany.mockResolvedValue({ count: 2 });
    tx.semester.findFirst.mockResolvedValue({ id: 'semester-aktif' });
    tx.jadwalPelajaran.updateMany.mockResolvedValue({ count: 2 });

    const req = {
      body: {
        teacherId: 'guru-1',
        subjectId: 'mapel-1',
        masterKelasIds: ['kelas-1', 'kelas-2'],
        hoursPerWeek: 6,
      },
    };
    const res = mockRes();

    await guruMapelController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(tx.guruMapel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          guru_id: 'guru-1',
          mata_pelajaran_id: 'mapel-1',
          kelas_diampu: 'X IPA 1, X IPA 2',
        }),
      })
    );
    expect(tx.guruMapelKelas.createMany).toHaveBeenCalledWith({
      data: [
        { guru_mapel_id: 'gm-1', master_kelas_id: 'kelas-1' },
        { guru_mapel_id: 'gm-1', master_kelas_id: 'kelas-2' },
      ],
      skipDuplicates: true,
    });
    expect(res.body.data).toMatchObject({
      masterKelasIds: ['kelas-1', 'kelas-2'],
      classes: 'X IPA 1, X IPA 2',
      syncedSchedules: 2,
    });
  });

  test('update masih menerima classes string legacy dan menulis pivot relasi', async () => {
    const tx = buildTx();
    mockTransaction(tx);
    prisma.guruMapel.findUnique.mockResolvedValue({
      id: 'gm-1',
      guru_id: 'guru-1',
      mata_pelajaran_id: 'mapel-1',
      kelas_diampu: 'X IPA 1, X IPA 2',
    });
    tx.guruMapel.update.mockResolvedValue({
      id: 'gm-1',
      guru: { nama_lengkap: 'Guru 1' },
      mata_pelajaran: { nama: 'Matematika' },
      jam_per_minggu: 4,
    });
    tx.guruMapelKelas.deleteMany.mockResolvedValue({ count: 2 });
    tx.guruMapelKelas.createMany.mockResolvedValue({ count: 1 });
    tx.semester.findFirst.mockResolvedValue({ id: 'semester-aktif' });
    tx.jadwalPelajaran.updateMany.mockResolvedValue({ count: 1 });

    const req = {
      params: { id: 'gm-1' },
      body: {
        classes: 'X IPA 2',
        hoursPerWeek: 4,
      },
    };
    const res = mockRes();

    await guruMapelController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.guruMapelKelas.deleteMany).toHaveBeenCalledWith({
      where: { guru_mapel_id: 'gm-1' },
    });
    expect(tx.guruMapelKelas.createMany).toHaveBeenCalledWith({
      data: [{ guru_mapel_id: 'gm-1', master_kelas_id: 'kelas-2' }],
      skipDuplicates: true,
    });
    expect(res.body.data).toMatchObject({
      masterKelasIds: ['kelas-2'],
      classes: 'X IPA 2',
    });
  });
});
