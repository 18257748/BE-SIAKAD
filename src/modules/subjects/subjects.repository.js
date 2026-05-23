const prisma = require('../../config/prisma');

class SubjectsRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findAll({ search = '' } = {}) {
    const where = search
      ? {
          OR: [
            { kode: { contains: search, mode: 'insensitive' } },
            { nama: { contains: search, mode: 'insensitive' } },
            { kategori: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.client.mataPelajaran.findMany({
      where,
      orderBy: { kode: 'asc' },
    });
  }

  create(data) {
    return this.client.mataPelajaran.create({ data });
  }

  update(id, data) {
    return this.client.mataPelajaran.update({ where: { id }, data });
  }

  delete(id) {
    return this.client.mataPelajaran.delete({ where: { id } });
  }
}

module.exports = { SubjectsRepository, subjectsRepository: new SubjectsRepository() };
