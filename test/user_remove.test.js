jest.mock('../src/config/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
}));

const prisma = require('../src/config/prisma');
const { remove } = require('../src/controllers/userController');

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

describe('User remove', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('mengembalikan 404 jika pengguna tidak ditemukan', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const req = { params: { id: 'user-missing' } };
    const res = mockRes();

    await remove(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });
});
