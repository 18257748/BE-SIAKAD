jest.mock('../src/config/prisma', () => ({}));

describe('app export', () => {
  test('src/app exports an Express app without opening the port', () => {
    const app = require('../src/app');

    expect(typeof app).toBe('function');
    expect(typeof app.listen).toBe('function');
  });
});
