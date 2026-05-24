jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'session-001'),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn((payload, _secret, options) => `token-${options.expiresIn}`),
  verify: jest.fn(),
}));

jest.mock('../src/config/prisma', () => ({
  jadwalPelajaran: {
    findUnique: jest.fn(),
  },
  sesiAbsensi: {
    findUnique: jest.fn(),
  },
  kehadiran: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  semester: {
    findFirst: jest.fn(),
  },
  jurnalMengajar: {
    findFirst: jest.fn(),
  },
  tahunAjaran: {
    findFirst: jest.fn(),
  },
  rombel: {
    findFirst: jest.fn(),
  },
  rombelSiswa: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const prisma = require('../src/config/prisma');
const { generateQR, refreshQR, qrScan } = require('../src/controllers/kehadiranController');

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
    sesiAbsensi: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('QR attendance session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-07T00:00:00.000Z'));
    prisma.jadwalPelajaran.findUnique.mockResolvedValue({
      id: 'jadwal-001',
      master_kelas_id: 'kelas-001',
      mata_pelajaran_id: 'mapel-001',
      semester_id: 'semester-001',
    });
    prisma.jurnalMengajar.findFirst.mockResolvedValue({
      pertemuan_ke: 1,
      judul_materi: 'Bab 1',
      deskripsi_kegiatan: 'Pembuka',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('generateQR membuat sesi 3 menit dan token 1 menit', async () => {
    const tx = buildTx();
    prisma.$transaction.mockImplementation(async (cb) => cb(tx));
    tx.sesiAbsensi.findFirst.mockResolvedValue(null);
    tx.sesiAbsensi.updateMany.mockResolvedValue({ count: 0 });
    tx.sesiAbsensi.create.mockResolvedValue({
      id: 'session-001',
      jadwal_id: 'jadwal-001',
      guru_id: 'guru-001',
      tanggal: '2026-05-07',
      pertemuan_ke: 1,
      token: 'token-60',
      created_at: new Date('2026-05-07T00:00:00.000Z'),
      expired_at: new Date('2026-05-07T00:03:00.000Z'),
      is_active: true,
    });

    const req = {
      user: { userId: 'guru-001' },
      body: { jadwalId: 'jadwal-001', tanggal: '2026-05-07', pertemuanKe: 1 },
    };
    const res = mockRes();

    await generateQR(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-001' }),
      expect.any(String),
      { expiresIn: 60 }
    );
    expect(res.body.data).toMatchObject({
      sessionId: 'session-001',
      token: 'token-60',
      expiresIn: 180,
      tokenExpiresIn: 60,
    });
    expect(res.body.data.sessionExpiredAt).toBe('2026-05-07T00:03:00.000Z');
  });

  test('refreshQR memakai sesi aktif yang sama dan memperbarui token', async () => {
    const tx = buildTx();
    prisma.$transaction.mockImplementation(async (cb) => cb(tx));
    tx.sesiAbsensi.findFirst.mockResolvedValue({
      id: 'session-001',
      jadwal_id: 'jadwal-001',
      guru_id: 'guru-001',
      tanggal: '2026-05-07',
      pertemuan_ke: 1,
      token: 'token-old',
      created_at: new Date('2026-05-07T00:00:00.000Z'),
      expired_at: new Date('2026-05-07T00:03:00.000Z'),
      is_active: true,
    });
    tx.sesiAbsensi.update.mockResolvedValue({
      id: 'session-001',
      jadwal_id: 'jadwal-001',
      guru_id: 'guru-001',
      tanggal: '2026-05-07',
      pertemuan_ke: 1,
      token: 'token-60',
      created_at: new Date('2026-05-07T00:00:00.000Z'),
      expired_at: new Date('2026-05-07T00:03:00.000Z'),
      is_active: true,
    });

    const req = {
      user: { userId: 'guru-001' },
      body: { jadwalId: 'jadwal-001', tanggal: '2026-05-07', pertemuanKe: 1 },
    };
    const res = mockRes();

    await refreshQR(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.sesiAbsensi.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-001' },
        data: expect.objectContaining({ token: 'token-60', is_active: true }),
      })
    );
    expect(res.body.data.token).toBe('token-60');
    expect(res.body.data.tokenExpiredAt).toBe('2026-05-07T00:01:00.000Z');
  });

  test('refreshQR menolak sesi yang sudah berakhir', async () => {
    const tx = buildTx();
    prisma.$transaction.mockImplementation(async (cb) => cb(tx));
    tx.sesiAbsensi.findFirst.mockResolvedValue({
      id: 'session-001',
      jadwal_id: 'jadwal-001',
      guru_id: 'guru-001',
      tanggal: '2026-05-07',
      pertemuan_ke: 1,
      token: 'token-old',
      created_at: new Date('2026-05-06T23:57:00.000Z'),
      expired_at: new Date('2026-05-07T00:00:00.000Z'),
      is_active: true,
    });
    tx.sesiAbsensi.updateMany.mockResolvedValue({ count: 1 });

    const req = {
      user: { userId: 'guru-001' },
      body: { jadwalId: 'jadwal-001', tanggal: '2026-05-07', pertemuanKe: 1 },
    };
    const res = mockRes();

    await refreshQR(req, res);

    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.body.message).toBe('Sesi QR presensi sudah ditutup');
    expect(tx.sesiAbsensi.update).not.toHaveBeenCalled();
  });

  test('qrScan menolak token lama yang sudah diganti token baru', async () => {
    jwt.verify.mockReturnValue({
      sessionId: 'session-001',
      jadwalId: 'jadwal-001',
      tanggal: '2026-05-07',
      pertemuanKe: 1,
      guruId: 'guru-001',
      type: 'qr_attendance',
    });

    prisma.sesiAbsensi.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'session-001',
        jadwal_id: 'jadwal-001',
        guru_id: 'guru-001',
        tanggal: '2026-05-07',
        pertemuan_ke: 1,
        token: 'token-current',
        created_at: new Date('2026-05-07T00:00:00.000Z'),
        expired_at: new Date('2026-05-07T00:03:00.000Z'),
        is_active: true,
      });

    const req = {
      user: { userId: 'siswa-001' },
      body: {
        qrToken: 'token-old',
        jadwalId: 'jadwal-001',
        tanggal: '2026-05-07',
      },
    };
    const res = mockRes();

    await qrScan(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toContain('QR presensi sudah kedaluwarsa');
    expect(prisma.kehadiran.upsert).not.toHaveBeenCalled();
  });

  test('qrScan menolak sesi yang sudah ditutup', async () => {
    jwt.verify.mockReturnValue({
      sessionId: 'session-001',
      jadwalId: 'jadwal-001',
      tanggal: '2026-05-07',
      pertemuanKe: 1,
      guruId: 'guru-001',
      type: 'qr_attendance',
    });

    prisma.sesiAbsensi.findUnique.mockResolvedValue({
      id: 'session-001',
      jadwal_id: 'jadwal-001',
      guru_id: 'guru-001',
      tanggal: '2026-05-07',
      pertemuan_ke: 1,
      token: 'token-current',
      created_at: new Date('2026-05-06T23:57:00.000Z'),
      expired_at: new Date('2026-05-07T00:00:00.000Z'),
      is_active: false,
    });

    const req = {
      user: { userId: 'siswa-001' },
      body: {
        qrToken: 'token-current',
        jadwalId: 'jadwal-001',
        tanggal: '2026-05-07',
      },
    };
    const res = mockRes();

    await qrScan(req, res);

    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.body.message).toBe('Sesi QR presensi sudah ditutup');
    expect(prisma.kehadiran.upsert).not.toHaveBeenCalled();
  });

  test('qrScan menolak scan ulang siswa yang sudah HADIR', async () => {
    jwt.verify.mockReturnValue({
      sessionId: 'session-001',
      jadwalId: 'jadwal-001',
      tanggal: '2026-05-07',
      pertemuanKe: 1,
      guruId: 'guru-001',
      type: 'qr_attendance',
    });

    prisma.sesiAbsensi.findUnique.mockResolvedValue({
      id: 'session-001',
      jadwal_id: 'jadwal-001',
      guru_id: 'guru-001',
      tanggal: '2026-05-07',
      pertemuan_ke: 1,
      token: 'token-current',
      created_at: new Date('2026-05-07T00:00:00.000Z'),
      expired_at: new Date('2026-05-07T00:03:00.000Z'),
      is_active: true,
    });
    prisma.jadwalPelajaran.findUnique.mockResolvedValue({
      master_kelas_id: 'kelas-001',
    });
    prisma.tahunAjaran.findFirst.mockResolvedValue({ id: 'ta-001' });
    prisma.rombel.findFirst.mockResolvedValue({ id: 'rombel-001' });
    prisma.rombelSiswa.findFirst.mockResolvedValue({ id: 'enroll-001' });
    prisma.kehadiran.findUnique.mockResolvedValue({
      id: 'kehadiran-001',
      status: 'HADIR',
    });

    const req = {
      user: { userId: 'siswa-001' },
      body: {
        qrToken: 'token-current',
        jadwalId: 'jadwal-001',
        tanggal: '2026-05-07',
      },
    };
    const res = mockRes();

    await qrScan(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.body.message).toBe('Kehadiran sudah tercatat');
    expect(prisma.kehadiran.upsert).not.toHaveBeenCalled();
  });

  test('qrScan menyimpan HADIR saat token dan sesi valid', async () => {
    jwt.verify.mockReturnValue({
      sessionId: 'session-001',
      jadwalId: 'jadwal-001',
      tanggal: '2026-05-07',
      pertemuanKe: 1,
      guruId: 'guru-001',
      type: 'qr_attendance',
    });

    prisma.sesiAbsensi.findUnique.mockResolvedValue({
      id: 'session-001',
      jadwal_id: 'jadwal-001',
      guru_id: 'guru-001',
      tanggal: '2026-05-07',
      pertemuan_ke: 1,
      token: 'token-current',
      created_at: new Date('2026-05-07T00:00:00.000Z'),
      expired_at: new Date('2026-05-07T00:03:00.000Z'),
      is_active: true,
    });
    prisma.jadwalPelajaran.findUnique.mockResolvedValue({
      master_kelas_id: 'kelas-001',
    });
    prisma.tahunAjaran.findFirst.mockResolvedValue({ id: 'ta-001' });
    prisma.rombel.findFirst.mockResolvedValue({ id: 'rombel-001' });
    prisma.rombelSiswa.findFirst.mockResolvedValue({ id: 'enroll-001' });
    prisma.kehadiran.findUnique.mockResolvedValue(null);
    prisma.jurnalMengajar.findFirst.mockResolvedValue({
      pertemuan_ke: 1,
      judul_materi: 'Bab 1',
      deskripsi_kegiatan: 'Pembuka',
    });
    prisma.kehadiran.upsert.mockResolvedValue({ id: 'kehadiran-001', status: 'HADIR' });

    const req = {
      user: { userId: 'siswa-001' },
      body: {
        qrToken: 'token-current',
        jadwalId: 'jadwal-001',
        tanggal: '2026-05-07',
      },
    };
    const res = mockRes();

    await qrScan(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.message).toBe('Kehadiran berhasil dicatat');
    expect(prisma.kehadiran.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: 'HADIR' }),
        create: expect.objectContaining({ status: 'HADIR' }),
      })
    );
  });
});
