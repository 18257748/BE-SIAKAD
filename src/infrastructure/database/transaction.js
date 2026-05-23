const prisma = require('../../config/prisma');

const runInTransaction = (callback, options) => {
  return prisma.$transaction(callback, options);
};

module.exports = { runInTransaction };
