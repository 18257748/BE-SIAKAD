jest.mock('../src/config/prisma', () => ({
  rombel: {
    findUnique: jest.fn(),
  },
  rombelSiswa: {
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
}));

const prisma = require('../src/config/prisma');
const { executePromosi } = require('../src/controllers/promosiController');

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

function mockTransaction(tx) {
  prisma.$transaction.mockImplementation(async (callback) => callback(tx));
}

function buildTx() {
  return {
    rombel: {
      findUnique: jest.fn(),
    },
    rombelSiswa: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };
}

describe('executePromosi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('menolak request tanpa tahunAjaranBaruId', async () => {
    const req = {
      body: {
        rombelAsalId: 'rombel-asal',
        rombelTujuanId: 'rombel-tujuan',
        siswaIds: ['siswa-1'],
      },
    };
    const res = mockRes();

    await executePromosi(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('menolak jika rombel asal dan tujuan sama', async () => {
    const req = {
      body: {
        rombelAsalId: 'rombel-1',
        rombelTujuanId: 'rombel-1',
        tahunAjaranBaruId: 'ta-2026',
        siswaIds: ['siswa-1'],
      },
    };
    const res = mockRes();

    await executePromosi(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toBe('Rombel asal dan rombel tujuan tidak boleh sama');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('menolak jika rombel tujuan bukan dari tahun ajaran target', async () => {
    const tx = buildTx();
    mockTransaction(tx);

    tx.rombel.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === 'rombel-asal') {
        return { id: 'rombel-asal', tahun_ajaran_id: 'ta-2025', is_locked: true };
      }
      if (where.id === 'rombel-tujuan') {
        return { id: 'rombel-tujuan', tahun_ajaran_id: 'ta-2024' };
      }
      return null;
    });

    const req = {
      body: {
        rombelAsalId: 'rombel-asal',
        rombelTujuanId: 'rombel-tujuan',
        tahunAjaranBaruId: 'ta-2026',
        siswaIds: ['siswa-1'],
      },
    };
    const res = mockRes();

    await executePromosi(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toBe('Rombel tujuan bukan dari Tahun Ajaran Baru yang dipilih');
    expect(tx.rombelSiswa.findMany).not.toHaveBeenCalled();
  });

  test('menolak siswa yang tidak berasal dari rombel asal', async () => {
    const tx = buildTx();
    mockTransaction(tx);

    tx.rombel.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === 'rombel-asal') {
        return { id: 'rombel-asal', tahun_ajaran_id: 'ta-2025', is_locked: true };
      }
      if (where.id === 'rombel-tujuan') {
        return { id: 'rombel-tujuan', tahun_ajaran_id: 'ta-2026' };
      }
      return null;
    });
    tx.user.findMany.mockResolvedValue([
      { id: 'siswa-1', nama_lengkap: 'Aulia', nomor_induk: '001' },
    ]);
    tx.rombelSiswa.findMany.mockResolvedValue([]);

    const req = {
      body: {
        rombelAsalId: 'rombel-asal',
        rombelTujuanId: 'rombel-tujuan',
        tahunAjaranBaruId: 'ta-2026',
        siswaIds: ['siswa-1'],
      },
    };
    const res = mockRes();

    await executePromosi(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toContain('Siswa berikut tidak berasal dari rombel asal');
    expect(res.body.message).toContain('Aulia (001)');
    expect(tx.rombelSiswa.createMany).not.toHaveBeenCalled();
  });

  test('menolak siswa yang sudah terdaftar di rombel lain pada tahun ajaran target', async () => {
    const tx = buildTx();
    mockTransaction(tx);

    tx.rombel.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === 'rombel-asal') {
        return { id: 'rombel-asal', tahun_ajaran_id: 'ta-2025', is_locked: true };
      }
      if (where.id === 'rombel-tujuan') {
        return { id: 'rombel-tujuan', tahun_ajaran_id: 'ta-2026' };
      }
      return null;
    });
    tx.user.findMany.mockResolvedValue([
      { id: 'siswa-1', nama_lengkap: 'Aulia', nomor_induk: '001' },
    ]);
    tx.rombelSiswa.findMany
      .mockResolvedValueOnce([{ siswa_id: 'siswa-1' }])
      .mockResolvedValueOnce([
        {
          siswa_id: 'siswa-1',
          siswa: { id: 'siswa-1', nama_lengkap: 'Aulia', nomor_induk: '001' },
          rombel: {
            master_kelas: { nama: 'XI-2' },
          },
        },
      ]);

    const req = {
      body: {
        rombelAsalId: 'rombel-asal',
        rombelTujuanId: 'rombel-tujuan',
        tahunAjaranBaruId: 'ta-2026',
        siswaIds: ['siswa-1'],
      },
    };
    const res = mockRes();

    await executePromosi(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toContain('sudah terdaftar pada tahun ajaran target');
    expect(res.body.message).toContain('Aulia (001)');
    expect(res.body.message).toContain('XI-2');
    expect(tx.rombelSiswa.createMany).not.toHaveBeenCalled();
  });

  test('berhasil membuat relasi rombel baru saat semua validasi lolos', async () => {
    const tx = buildTx();
    mockTransaction(tx);

    tx.rombel.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === 'rombel-asal') {
        return { id: 'rombel-asal', tahun_ajaran_id: 'ta-2025', is_locked: true };
      }
      if (where.id === 'rombel-tujuan') {
        return { id: 'rombel-tujuan', tahun_ajaran_id: 'ta-2026' };
      }
      return null;
    });
    tx.user.findMany.mockResolvedValue([
      { id: 'siswa-1', nama_lengkap: 'Aulia', nomor_induk: '001' },
      { id: 'siswa-2', nama_lengkap: 'Bima', nomor_induk: '002' },
    ]);
    tx.rombelSiswa.findMany
      .mockResolvedValueOnce([
        { siswa_id: 'siswa-1' },
        { siswa_id: 'siswa-2' },
      ])
      .mockResolvedValueOnce([]);
    tx.rombelSiswa.createMany.mockResolvedValue({ count: 2 });

    const req = {
      body: {
        rombelAsalId: 'rombel-asal',
        rombelTujuanId: 'rombel-tujuan',
        tahunAjaranBaruId: 'ta-2026',
        siswaIds: ['siswa-1', 'siswa-2'],
      },
    };
    const res = mockRes();

    await executePromosi(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(tx.rombelSiswa.createMany).toHaveBeenCalledWith({
      data: [
        {
          rombel_id: 'rombel-tujuan',
          siswa_id: 'siswa-1',
          status_promosi: null,
        },
        {
          rombel_id: 'rombel-tujuan',
          siswa_id: 'siswa-2',
          status_promosi: null,
        },
      ],
    });
  });

  test('mengembalikan 400 jika createMany terkena P2002', async () => {
    const tx = buildTx();
    mockTransaction(tx);

    tx.rombel.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === 'rombel-asal') {
        return { id: 'rombel-asal', tahun_ajaran_id: 'ta-2025', is_locked: true };
      }
      if (where.id === 'rombel-tujuan') {
        return { id: 'rombel-tujuan', tahun_ajaran_id: 'ta-2026' };
      }
      return null;
    });
    tx.user.findMany.mockResolvedValue([
      { id: 'siswa-1', nama_lengkap: 'Aulia', nomor_induk: '001' },
    ]);
    tx.rombelSiswa.findMany
      .mockResolvedValueOnce([{ siswa_id: 'siswa-1' }])
      .mockResolvedValueOnce([]);
    tx.rombelSiswa.createMany.mockRejectedValue({ code: 'P2002' });

    const req = {
      body: {
        rombelAsalId: 'rombel-asal',
        rombelTujuanId: 'rombel-tujuan',
        tahunAjaranBaruId: 'ta-2026',
        siswaIds: ['siswa-1'],
      },
    };
    const res = mockRes();

    await executePromosi(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toContain('konflik data promosi');
  });
});
