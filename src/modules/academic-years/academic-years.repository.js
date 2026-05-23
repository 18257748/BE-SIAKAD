const prisma = require('../../config/prisma');

class AcademicYearsRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findAll() {
    return this.client.tahunAjaran.findMany({
      orderBy: { kode: 'desc' },
      include: { _count: { select: { semester: true, rombel: true } } },
    });
  }

  findById(id) {
    return this.client.tahunAjaran.findUnique({ where: { id } });
  }

  create(data, tx = this.client) {
    return tx.tahunAjaran.create({ data });
  }

  update(id, data) {
    return this.client.tahunAjaran.update({ where: { id }, data });
  }

  delete(id) {
    return this.client.tahunAjaran.delete({ where: { id } });
  }

  deactivateAll(tx = this.client) {
    return tx.tahunAjaran.updateMany({ data: { is_active: false } });
  }

  deactivateAllSemesters(tx = this.client) {
    return tx.semester.updateMany({ data: { is_active: false } });
  }

  deactivateSemestersForYear(yearId, tx = this.client) {
    return tx.semester.updateMany({
      where: { tahun_ajaran_id: yearId },
      data: { is_active: false },
    });
  }

  updateInTransaction(id, data, tx) {
    return tx.tahunAjaran.update({ where: { id }, data });
  }

  findMasterClasses() {
    return this.client.masterKelas.findMany({
      select: { id: true, nama: true },
      orderBy: { nama: 'asc' },
    });
  }

  findStudyGroupsByYear(yearId) {
    return this.client.rombel.findMany({
      where: { tahun_ajaran_id: yearId },
      select: { master_kelas_id: true },
    });
  }

  createStudyGroups(data) {
    return this.client.rombel.createMany({ data, skipDuplicates: true });
  }

  transaction(callback) {
    return this.client.$transaction(callback);
  }
}

module.exports = {
  AcademicYearsRepository,
  academicYearsRepository: new AcademicYearsRepository(),
};
