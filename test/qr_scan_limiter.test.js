function mockRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    set: jest.fn(function set(headers) {
      this.headers = { ...this.headers, ...headers };
      return this;
    }),
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

describe('qrScanLimiter', () => {
  let qrScanLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    ({ qrScanLimiter } = require('../src/middlewares/rateLimiter'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('menghitung limit berdasarkan user id meski ip berubah', () => {
    const next = jest.fn();

    for (let i = 0; i < 3; i++) {
      const req = {
        user: { userId: 'siswa-001' },
        ip: `10.0.0.${i + 1}`,
        connection: { remoteAddress: `10.0.0.${i + 1}` },
      };
      const res = mockRes();
      qrScanLimiter(req, res, next);
      expect(res.status).not.toHaveBeenCalled();
    }

    const blockedRes = mockRes();
    qrScanLimiter(
      {
        user: { userId: 'siswa-001' },
        ip: '192.168.1.50',
        connection: { remoteAddress: '192.168.1.50' },
      },
      blockedRes,
      next
    );

    expect(blockedRes.status).toHaveBeenCalledWith(429);
    expect(blockedRes.body.message).toBe('Terlalu banyak percobaan scan. Tunggu beberapa detik.');
  });

  test('fallback ke ip jika user belum tersedia', () => {
    const next = jest.fn();
    const req = {
      ip: '203.0.113.10',
      connection: { remoteAddress: '203.0.113.10' },
    };

    for (let i = 0; i < 3; i++) {
      const res = mockRes();
      qrScanLimiter(req, res, next);
      expect(res.status).not.toHaveBeenCalled();
    }

    const blockedRes = mockRes();
    qrScanLimiter(req, blockedRes, next);
    expect(blockedRes.status).toHaveBeenCalledWith(429);
  });
});
