const prisma = require('../../config/prisma');

class SemestersRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findAll() {
    return this.client.semester.findMany({
      include: { tahun_ajaran: true },
      orderBy: [{ tahun_ajaran: { kode: 'desc' } }, { nama: 'asc' }],
    });
  }

  findById(id) {
    return this.client.semester.findUnique({
      where: { id },
      include: { tahun_ajaran: { select: { id: true, is_active: true, kode: true } } },
    });
  }

  findByIdWithYear(id) {
    return this.client.semester.findUnique({
      where: { id },
      include: { tahun_ajaran: true },
    });
  }

  findActive() {
    return this.client.semester.findFirst({
      where: { is_active: true },
      include: { tahun_ajaran: true },
    });
  }

  findAcademicYearById(id) {
    return this.client.tahunAjaran.findUnique({
      where: { id },
      select: { id: true, kode: true, is_active: true },
    });
  }

  create(data, tx = this.client) {
    return tx.semester.create({ data, include: { tahun_ajaran: true } });
  }

  update(id, data, tx = this.client) {
    return tx.semester.update({
      where: { id },
      data,
      include: { tahun_ajaran: true },
    });
  }

  delete(id) {
    return this.client.semester.delete({ where: { id } });
  }

  deactivateAll(tx = this.client) {
    return tx.semester.updateMany({ data: { is_active: false } });
  }

  transaction(callback) {
    return this.client.$transaction(callback);
  }
}

module.exports = { SemestersRepository, semestersRepository: new SemestersRepository() };
