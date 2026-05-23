const AppError = require('../../shared/errors/AppError');
const NotFoundError = require('../../shared/errors/NotFoundError');
const { toCreateSemesterData, toUpdateSemesterData } = require('./semesters.dto');
const { toActiveSemesterDto, toSemesterDto } = require('./semesters.mapper');
const { semestersRepository } = require('./semesters.repository');
const { validateCreateSemester, validateUpdateSemester } = require('./semesters.validation');

class SemestersService {
  constructor(repository = semestersRepository) {
    this.repository = repository;
  }

  async listSemesters() {
    const semesters = await this.repository.findAll();
    return semesters.map(toSemesterDto);
  }

  async getActiveSemester() {
    const semester = await this.repository.findActive();
    return toActiveSemesterDto(semester);
  }

  async assertActiveAcademicYear(academicYearId) {
    const year = await this.repository.findAcademicYearById(academicYearId);
    if (!year) throw new NotFoundError('Tahun ajaran tidak ditemukan');
    if (!year.is_active) {
      throw new AppError(
        `Semester hanya bisa diaktifkan jika tahun ajaran induk "${year.kode}" sedang aktif.`,
        {
          statusCode: 400,
          code: 'SEMESTER_YEAR_MISMATCH',
          fields: { academicYearId: ['Tahun ajaran harus aktif'] },
        }
      );
    }
  }

  async createSemester(input) {
    validateCreateSemester(input);
    const data = toCreateSemesterData(input);

    if (data.is_active) {
      await this.assertActiveAcademicYear(data.tahun_ajaran_id);
    }

    const semester = await this.repository.transaction(async (tx) => {
      if (data.is_active) await this.repository.deactivateAll(tx);
      return this.repository.create(data, tx);
    });

    return toSemesterDto(semester);
  }

  async updateSemester(id, input) {
    validateUpdateSemester(input);
    const data = toUpdateSemesterData(input);

    if (data.is_active) {
      const targetAcademicYearId = data.tahun_ajaran_id
        || (await this.repository.findById(id))?.tahun_ajaran_id;
      await this.assertActiveAcademicYear(targetAcademicYearId);
    }

    const semester = await this.repository.transaction(async (tx) => {
      if (data.is_active) await this.repository.deactivateAll(tx);
      return this.repository.update(id, data, tx);
    });

    return toSemesterDto(semester);
  }

  async toggleSemester(id) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError('Semester tidak ditemukan');

    const newActive = !existing.is_active;
    if (newActive && !existing.tahun_ajaran?.is_active) {
      throw new AppError(
        `Semester hanya bisa diaktifkan jika tahun ajaran induk "${existing.tahun_ajaran?.kode || '-'}" sedang aktif.`,
        {
          statusCode: 400,
          code: 'SEMESTER_YEAR_MISMATCH',
          fields: { academicYearId: ['Tahun ajaran harus aktif'] },
        }
      );
    }

    const semester = await this.repository.transaction(async (tx) => {
      if (newActive) await this.repository.deactivateAll(tx);
      return this.repository.update(id, { is_active: newActive }, tx);
    });

    return {
      message: `Semester berhasil ${newActive ? 'diaktifkan' : 'dinonaktifkan'}`,
      data: toSemesterDto(semester),
    };
  }

  async deleteSemester(id) {
    await this.repository.delete(id);
  }
}

module.exports = { SemestersService, semestersService: new SemestersService() };
