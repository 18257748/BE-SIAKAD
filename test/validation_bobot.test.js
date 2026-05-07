const { validateBobotTotal } = require('../src/middlewares/validationMiddleware');

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

describe('validateBobotTotal', () => {
  test('menerima total bobot 33.3 + 33.3 + 33.4', () => {
    const req = {
      body: {
        bobot: {
          tugas: 33.3,
          uh: 33.3,
          uts: 33.4,
        },
      },
    };
    const res = mockRes();
    const next = jest.fn();

    validateBobotTotal(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('menolak total bobot 99', () => {
    const req = {
      body: {
        bobot: {
          tugas: 33,
          uh: 33,
          uts: 33,
        },
      },
    };
    const res = mockRes();
    const next = jest.fn();

    validateBobotTotal(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toContain('99.00%');
    expect(next).not.toHaveBeenCalled();
  });

  test('menolak total bobot 101', () => {
    const req = {
      body: {
        bobot: {
          tugas: 34,
          uh: 34,
          uts: 33,
        },
      },
    };
    const res = mockRes();
    const next = jest.fn();

    validateBobotTotal(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toContain('101.00%');
    expect(next).not.toHaveBeenCalled();
  });
});
