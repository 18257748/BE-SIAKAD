const express = require('express');
const request = require('supertest');

jest.mock('../src/config/prisma', () => ({
  rombel: { findFirst: jest.fn(), update: jest.fn() },
  rombelSiswa: { updateMany: jest.fn() },
  semester: { findMany: jest.fn() },
  nilai: { findMany: jest.fn() },
  kehadiran: { findMany: jest.fn() },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/prisma');
const { getSiswaPromosi, lockPromosi } = require('../src/controllers/promosiController');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { userId: 'wali-001', role: 'Wali Kelas' };
    next();
  });
  app.get('/api/promosi/rombel/:id', getSiswaPromosi);
  app.post('/api/promosi/lock', lockPromosi);
  return app;
}

const rombel = {
  id: 'rombel-001',
  tahun_ajaran_id: 'ta-001',
  is_locked: false,
  master_kelas: { id: 'kelas-001', nama: 'X-1', wali_kelas_id: 'wali-001' },
  tahun_ajaran: { id: 'ta-001', kode: '2026/2027' },
  wali_kelas: { id: 'wali-001', nama_lengkap: 'Wali Kelas' },
  siswa: [
    {
      siswa_id: 'siswa-001',
      status_promosi: null,
      siswa: { id: 'siswa-001', nama_lengkap: 'Aulia', nomor_induk: '001' },
    },
  ],
};

describe('Promosi Wali Kelas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.rombel.findFirst.mockResolvedValue(rombel);
    prisma.semester.findMany.mockResolvedValue([{ id: 'sem-ganjil' }, { id: 'sem-genap' }]);
  });

  test('mengembalikan perluCek jika nilai atau kehadiran belum lengkap', async () => {
    prisma.nilai.findMany.mockResolvedValue([]);
    prisma.kehadiran.findMany.mockResolvedValue([]);

    const res = await request(createApp()).get('/api/promosi/rombel/rombel-001');

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      id: 'siswa-001',
      status: 'perluCek',
      isDataComplete: false,
      missingData: ['nilai', 'kehadiran'],
      nilaiRataRata: 0,
      persentaseKehadiran: 0,
      });
  });

  test('menghitung SAKIT dan IZIN sebagai kehadiran valid', async () => {
    prisma.nilai.findMany.mockResolvedValue([
      { siswa_id: 'siswa-001', nilai_akhir: 80 },
    ]);
    prisma.kehadiran.findMany.mockResolvedValue([
      { siswa_id: 'siswa-001', status: 'HADIR' },
      { siswa_id: 'siswa-001', status: 'SAKIT' },
      { siswa_id: 'siswa-001', status: 'IZIN' },
      { siswa_id: 'siswa-001', status: 'ALPA' },
    ]);

    const res = await request(createApp()).get('/api/promosi/rombel/rombel-001');

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      persentaseKehadiran: 75,
      status: 'tinggal',
    });
  });

  test('menolak lock jika masih ada keputusan perluCek', async () => {
    const res = await request(createApp())
      .post('/api/promosi/lock')
      .send({
        rombelId: 'rombel-001',
        decisions: [{ siswaId: 'siswa-001', status: 'perluCek' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('naik atau tinggal');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('mengunci rombel dengan update batch', async () => {
    prisma.$transaction.mockResolvedValue([]);
    const res = await request(createApp())
      .post('/api/promosi/lock')
      .send({
        rombelId: 'rombel-001',
        decisions: [{ siswaId: 'siswa-001', status: 'naik' }],
      });

    expect(res.status).toBe(200);
    expect(prisma.rombelSiswa.updateMany).toHaveBeenCalledWith({
      where: {
        rombel_id: 'rombel-001',
        siswa_id: { in: ['siswa-001'] },
      },
      data: { status_promosi: 'NAIK' },
    });
    expect(prisma.rombel.update).toHaveBeenCalledWith({
      where: { id: 'rombel-001' },
      data: { is_locked: true },
    });
  });
});
