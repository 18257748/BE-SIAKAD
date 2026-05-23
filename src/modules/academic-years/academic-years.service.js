const NotFoundError = require('../../shared/errors/NotFoundError');
const { toCreateAcademicYearData, toUpdateAcademicYearData } = require('./academic-years.dto');
const { toAcademicYearDto } = require('./academic-years.mapper');
const { academicYearsRepository } = require('./academic-years.repository');
const {
  validateCreateAcademicYear,
  validateUpdateAcademicYear,
} = require('./academic-years.validation');

class AcademicYearsService {
  constructor(repository = academicYearsRepository) {
    this.repository = repository;
  }

  async listAcademicYears() {
    const years = await this.repository.findAll();
    return years.map(toAcademicYearDto);
  }

  async createAcademicYear(input) {
    validateCreateAcademicYear(input);
    const data = toCreateAcademicYearData(input);

    const year = await this.repository.transaction(async (tx) => {
      if (data.is_active) {
        await this.repository.deactivateAll(tx);
        await this.repository.deactivateAllSemesters(tx);
      }
      return this.repository.create(data, tx);
    });

    return toAcademicYearDto(year);
  }

  async updateAcademicYear(id, input) {
    validateUpdateAcademicYear(input);
    const data = toUpdateAcademicYearData(input);

    const year = await this.repository.transaction(async (tx) => {
      if (data.is_active) {
        await this.repository.deactivateAll(tx);
        await this.repository.deactivateAllSemesters(tx);
      }
      return this.repository.updateInTransaction(id, data, tx);
    });

    return toAcademicYearDto(year);
  }

  async toggleAcademicYear(id) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Tahun ajaran tidak ditemukan');

    const newActive = !existing.is_active;
    const year = await this.repository.transaction(async (tx) => {
      if (newActive) {
        await this.repository.deactivateAll(tx);
        await this.repository.deactivateAllSemesters(tx);
      } else {
        await this.repository.deactivateSemestersForYear(id, tx);
      }

      return this.repository.updateInTransaction(id, { is_active: newActive }, tx);
    });

    return {
      message: `Tahun ajaran berhasil ${newActive ? 'diaktifkan' : 'dinonaktifkan'}`,
      data: toAcademicYearDto(year),
    };
  }

  async generateStudyGroups(id) {
    const year = await this.repository.findById(id);
    if (!year) throw new NotFoundError('Tahun ajaran tidak ditemukan');

    const [masterClasses, existingStudyGroups] = await Promise.all([
      this.repository.findMasterClasses(),
      this.repository.findStudyGroupsByYear(id),
    ]);

    const existingMasterClassIds = new Set(
      existingStudyGroups.map((item) => item.master_kelas_id)
    );
    const missingMasterClasses = masterClasses.filter(
      (masterClass) => !existingMasterClassIds.has(masterClass.id)
    );

    let createdCount = 0;
    if (missingMasterClasses.length > 0) {
      const result = await this.repository.createStudyGroups(
        missingMasterClasses.map((masterClass) => ({
          master_kelas_id: masterClass.id,
          tahun_ajaran_id: id,
          wali_kelas_id: null,
          ruang_kelas_id: null,
        }))
      );
      createdCount = result.count;
    }

    return {
      tahunAjaranId: year.id,
      tahunAjaranCode: year.kode,
      totalMasterKelas: masterClasses.length,
      rombelDibuat: createdCount,
    };
  }

  async deleteAcademicYear(id) {
    await this.repository.delete(id);
  }
}

module.exports = {
  AcademicYearsService,
  academicYearsService: new AcademicYearsService(),
};
