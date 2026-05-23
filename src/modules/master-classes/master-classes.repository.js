const prisma = require('../../config/prisma');

class MasterClassesRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findActiveYear() {
    return this.client.tahunAjaran.findFirst({
      where: { is_active: true },
      select: { id: true },
    });
  }

  findAllTemplates() {
    return this.client.masterKelas.findMany({
      select: { id: true, nama: true, tingkat: true },
      orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }],
    });
  }

  findRombelByYear(yearId) {
    return this.client.rombel.findMany({
      where: { tahun_ajaran_id: yearId },
      select: {
        master_kelas_id: true,
        wali_kelas_id: true,
        ruang_kelas_id: true,
        wali_kelas: { select: { nama_lengkap: true } },
        ruang_kelas: { select: { kode: true } },
      },
    });
  }

  createTemplate(data) {
    return this.client.masterKelas.create({ data });
  }

  updateTemplate(id, data) {
    return this.client.masterKelas.update({ where: { id }, data });
  }

  deleteTemplate(id) {
    return this.client.masterKelas.delete({ where: { id } });
  }

  createRombel(data) {
    return this.client.rombel.create({
      data,
      include: {
        wali_kelas: { select: { nama_lengkap: true } },
        ruang_kelas: { select: { kode: true } },
      },
    });
  }

  upsertRombel({ masterClassId, academicYearId, update, create }) {
    return this.client.rombel.upsert({
      where: {
        master_kelas_id_tahun_ajaran_id: {
          master_kelas_id: masterClassId,
          tahun_ajaran_id: academicYearId,
        },
      },
      update,
      create,
      include: {
        wali_kelas: { select: { nama_lengkap: true } },
        ruang_kelas: { select: { kode: true } },
      },
    });
  }
}

module.exports = {
  MasterClassesRepository,
  masterClassesRepository: new MasterClassesRepository(),
};
