const prisma = require('../../config/prisma');

class RoomsRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findAll() {
    return this.client.ruangKelas.findMany({ orderBy: { kode: 'asc' } });
  }

  create(data) {
    return this.client.ruangKelas.create({ data });
  }

  update(id, data) {
    return this.client.ruangKelas.update({
      where: { id },
      data,
    });
  }

  delete(id) {
    return this.client.ruangKelas.delete({ where: { id } });
  }
}

module.exports = { RoomsRepository, roomsRepository: new RoomsRepository() };
