const { sendSuccess, sendCreated, sendNoContent } = require('../src/shared/http/response');
const { createPaginationMeta } = require('../src/shared/http/pagination');

const createMockResponse = () => ({
  req: { requestId: 'req-test-001' },
  statusCode: null,
  body: null,
  status: jest.fn(function status(code) {
    this.statusCode = code;
    return this;
  }),
  json: jest.fn(function json(payload) {
    this.body = payload;
    return this;
  }),
});

describe('shared HTTP response helpers', () => {
  test('sendSuccess mengirim envelope standar dan merge meta', () => {
    const res = createMockResponse();

    sendSuccess(res, {
      message: 'Data berhasil diambil',
      data: { id: 'item-001' },
      meta: { source: 'unit-test' },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Data berhasil diambil',
      data: { id: 'item-001' },
      meta: {
        source: 'unit-test',
        requestId: 'req-test-001',
      },
    });
    expect(res.body.meta.timestamp).toEqual(expect.any(String));
  });

  test('sendCreated memakai status 201', () => {
    const res = createMockResponse();

    sendCreated(res, {
      message: 'Data berhasil dibuat',
      data: { id: 'new-id' },
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.data).toEqual({ id: 'new-id' });
  });

  test('sendNoContent tetap 200 dengan data null untuk kompatibilitas FE', () => {
    const res = createMockResponse();

    sendNoContent(res, { message: 'Data berhasil dihapus' });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Data berhasil dihapus',
      data: null,
    });
  });

  test('createPaginationMeta menghitung metadata pagination', () => {
    expect(createPaginationMeta({ page: 2, limit: 10, total: 25 })).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
  });
});
