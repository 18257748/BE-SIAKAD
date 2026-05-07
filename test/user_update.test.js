jest.mock('../src/config/prisma', () => ({
  user: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
  },
}));

const prisma = require('../src/config/prisma');
const { update } = require('../src/controllers/userController');

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

describe('User update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('menolak email username atau nomor induk milik pengguna lain', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-002' });

    const req = {
      params: { id: 'user-001' },
      body: {
        email: 'existing@example.com',
        username: 'existing',
        idNumber: '12345',
      },
    };
    const res = mockRes();

    await update(req, res);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        NOT: { id: 'user-001' },
        OR: [
          { email: { equals: 'existing@example.com', mode: 'insensitive' } },
          { username: { equals: 'existing', mode: 'insensitive' } },
          { nomor_induk: '12345' },
        ],
      },
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('mengizinkan update user sendiri jika tidak ada conflict user lain', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({
      id: 'user-001',
      nama_lengkap: 'Aulia',
      email: 'aulia@example.com',
      username: 'aulia',
      nomor_induk: '12345',
      status_aktif: true,
      role: { nama_role: 'Siswa' },
      profile: null,
    });

    const req = {
      params: { id: 'user-001' },
      body: {
        name: 'Aulia',
        email: 'aulia@example.com',
      },
    };
    const res = mockRes();

    await update(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-001' },
      data: expect.objectContaining({
        nama_lengkap: 'Aulia',
        email: 'aulia@example.com',
      }),
    }));
  });

  test('mengubah P2002 menjadi 400 sebagai fallback', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockRejectedValue({ code: 'P2002' });

    const req = {
      params: { id: 'user-001' },
      body: {
        email: 'race@example.com',
      },
    };
    const res = mockRes();

    await update(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toContain('sudah digunakan');
  });
});
