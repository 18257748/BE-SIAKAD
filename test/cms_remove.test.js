jest.mock('../src/config/prisma', () => ({
  kontenPublik: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
}));

const prisma = require('../src/config/prisma');
const { remove } = require('../src/controllers/cmsController');

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

describe('CMS remove', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('mengembalikan 404 jika konten tidak ditemukan', async () => {
    prisma.kontenPublik.findUnique.mockResolvedValue(null);

    const req = { params: { id: 'cms-missing' } };
    const res = mockRes();

    await remove(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(prisma.kontenPublik.delete).not.toHaveBeenCalled();
  });
});
