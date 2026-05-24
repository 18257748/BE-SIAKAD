jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'session-001'),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'qr-token-001'),
}));

jest.mock('../src/config/prisma', () => ({
  jadwalPelajaran: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  guruMapel: {
    findFirst: jest.fn(),
  },
  jurnalMengajar: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/prisma');
const { quickSession } = require('../src/controllers/dashboardController');

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
    jurnalMengajar: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    sesiAbsensi: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

function mockTransaction(tx) {
  prisma.$transaction.mockImplementation(async (callback) => callback(tx));
}

const jadwal = {
  id: 'jadwal-001',
  mata_pelajaran_id: 'mapel-001',
  semester_id: 'semester-001',
  guru_id: 'guru-001',
  mata_pelajaran: { nama: 'Matematika' },
  master_kelas: { nama: 'X-1' },
};

const existingJurnal = {
  id: 'jurnal-existing',
  jadwal_id: 'jadwal-001',
  tanggal: '2026-05-07',
  pertemuan_ke: 2,
  jadwal: {
    mata_pelajaran: { nama: 'Matematika' },
    master_kelas: { nama: 'X-1' },
  },
};

describe('dashboardController.quickSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-06T18:30:00.000Z'));
    prisma.jadwalPelajaran.findUnique.mockResolvedValue(jadwal);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('membuat jurnal dan sesi absensi dalam transaction dengan tanggal Asia/Jakarta', async () => {
    const tx = buildTx();
    mockTransaction(tx);
    prisma.jurnalMengajar.findFirst.mockResolvedValue(null);
    tx.sesiAbsensi.findFirst.mockResolvedValue(null);
    tx.jurnalMengajar.findFirst.mockResolvedValue(null);
    tx.jurnalMengajar.create.mockResolvedValue({ id: 'jurnal-001' });
    tx.sesiAbsensi.updateMany.mockResolvedValue({ count: 0 });
    tx.sesiAbsensi.create.mockResolvedValue({ id: 'session-001' });

    const req = {
      user: { userId: 'guru-001' },
      body: { jadwalId: 'jadwal-001' },
    };
    const res = mockRes();

    await quickSession(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.jurnalMengajar.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jadwal_id: 'jadwal-001',
        semester_id: 'semester-001',
        guru_id: 'guru-001',
        tanggal: '2026-05-07',
        pertemuan_ke: 1,
      }),
    });
    expect(tx.sesiAbsensi.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'session-001',
        jadwal_id: 'jadwal-001',
        tanggal: '2026-05-07',
        pertemuan_ke: 1,
        token: 'qr-token-001',
        is_active: true,
      }),
    });
    expect(res.body.data).toMatchObject({
      sessionId: 'session-001',
      jurnalId: 'jurnal-001',
      jadwalId: 'jadwal-001',
      tanggal: '2026-05-07',
      pertemuanKe: 1,
      subject: 'Matematika',
      className: 'X-1',
    });
  });

  test('mengembalikan 409 jelas jika jurnal pertemuan sudah ada sebelum create', async () => {
    const tx = buildTx();
    mockTransaction(tx);
    prisma.jurnalMengajar.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ pertemuan_ke: 1 });
    tx.sesiAbsensi.findFirst.mockResolvedValue(null);
    tx.jurnalMengajar.findFirst.mockResolvedValue(existingJurnal);

    const req = {
      user: { userId: 'guru-001' },
      body: { jadwalId: 'jadwal-001' },
    };
    const res = mockRes();

    await quickSession(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.body.message).toContain('Jurnal untuk pertemuan ini sudah ada');
    expect(res.body.data).toMatchObject({
      jurnalId: 'jurnal-existing',
      pertemuanKe: 2,
      subject: 'Matematika',
      className: 'X-1',
    });
    expect(tx.jurnalMengajar.create).not.toHaveBeenCalled();
    expect(tx.sesiAbsensi.create).not.toHaveBeenCalled();
  });

  test('membuka ulang sesi untuk jurnal yang sudah ada pada tanggal hari ini', async () => {
    const tx = buildTx();
    mockTransaction(tx);
    prisma.jurnalMengajar.findFirst.mockResolvedValueOnce({ pertemuan_ke: 2 });
    tx.sesiAbsensi.findFirst.mockResolvedValue(null);
    tx.jurnalMengajar.findFirst.mockResolvedValue(existingJurnal);
    tx.sesiAbsensi.updateMany.mockResolvedValue({ count: 0 });
    tx.sesiAbsensi.create.mockResolvedValue({ id: 'session-001' });

    const req = {
      user: { userId: 'guru-001' },
      body: { jadwalId: 'jadwal-001' },
    };
    const res = mockRes();

    await quickSession(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.jurnalMengajar.create).not.toHaveBeenCalled();
    expect(tx.sesiAbsensi.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jadwal_id: 'jadwal-001',
        tanggal: '2026-05-07',
        pertemuan_ke: 2,
      }),
    });
    expect(res.body.data).toMatchObject({
      jurnalId: 'jurnal-existing',
      tanggal: '2026-05-07',
      pertemuanKe: 2,
    });
  });

  test('mengubah race P2002 menjadi 409 bukan 500', async () => {
    const tx = buildTx();
    mockTransaction(tx);
    prisma.jurnalMengajar.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...existingJurnal,
        pertemuan_ke: 1,
      })
      .mockResolvedValue({
        ...existingJurnal,
        pertemuan_ke: 1,
      });
    tx.sesiAbsensi.findFirst.mockResolvedValue(null);
    tx.jurnalMengajar.findFirst.mockResolvedValue(null);
    tx.jurnalMengajar.create.mockRejectedValue({ code: 'P2002' });

    const req = {
      user: { userId: 'guru-001' },
      body: { jadwalId: 'jadwal-001' },
    };
    const res = mockRes();

    await quickSession(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.body.message).toContain('Jurnal untuk pertemuan ini sudah ada');
    expect(res.body.data).toMatchObject({
      jurnalId: 'jurnal-existing',
      pertemuanKe: 1,
    });
  });
});
