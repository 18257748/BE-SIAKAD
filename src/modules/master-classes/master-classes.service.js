const AppError = require('../../shared/errors/AppError');
const { toMasterClassDto } = require('./master-classes.mapper');
const {
  toCreateMasterClassData,
  toRombelAssignmentData,
  toUpdateMasterClassData,
} = require('./master-classes.dto');
const { masterClassesRepository } = require('./master-classes.repository');
const {
  validateCreateMasterClass,
  validateUpdateMasterClass,
} = require('./master-classes.validation');

class MasterClassesService {
  constructor(repository = masterClassesRepository) {
    this.repository = repository;
  }

  async listMasterClasses() {
    const activeYear = await this.repository.findActiveYear();
    const [masterClasses, activeRombel] = await Promise.all([
      this.repository.findAllTemplates(),
      activeYear ? this.repository.findRombelByYear(activeYear.id) : Promise.resolve([]),
    ]);

    const rombelMap = new Map(activeRombel.map((item) => [item.master_kelas_id, item]));
    return masterClasses.map((masterClass) => toMasterClassDto(masterClass, rombelMap.get(masterClass.id)));
  }

  async createMasterClass(input) {
    validateCreateMasterClass(input);
    const masterClass = await this.repository.createTemplate(toCreateMasterClassData(input));

    let rombel = null;
    if (input.homeroomTeacherId || input.classroomId) {
      const activeYear = await this.repository.findActiveYear();
      if (activeYear) {
        rombel = await this.repository.createRombel({
          master_kelas_id: masterClass.id,
          tahun_ajaran_id: activeYear.id,
          wali_kelas_id: input.homeroomTeacherId || null,
          ruang_kelas_id: input.classroomId || null,
        });
      }
    }

    return toMasterClassDto(masterClass, rombel);
  }

  async updateMasterClass(id, input) {
    validateUpdateMasterClass(input);
    const masterClass = await this.repository.updateTemplate(id, toUpdateMasterClassData(input));
    const hasRombelFields = input.homeroomTeacherId !== undefined || input.classroomId !== undefined;

    let rombel = null;
    if (hasRombelFields) {
      const activeYear = await this.repository.findActiveYear();
      if (!activeYear) {
        throw new AppError('Tidak ada tahun ajaran aktif. Aktifkan tahun ajaran terlebih dahulu.', {
          statusCode: 400,
          code: 'ACADEMIC_YEAR_NOT_ACTIVE',
        });
      }

      const assignmentData = toRombelAssignmentData(input);
      rombel = await this.repository.upsertRombel({
        masterClassId: id,
        academicYearId: activeYear.id,
        update: assignmentData,
        create: {
          master_kelas_id: id,
          tahun_ajaran_id: activeYear.id,
          wali_kelas_id: input.homeroomTeacherId || null,
          ruang_kelas_id: input.classroomId || null,
        },
      });
    }

    return toMasterClassDto(masterClass, rombel);
  }

  async deleteMasterClass(id) {
    await this.repository.deleteTemplate(id);
  }
}

module.exports = {
  MasterClassesService,
  masterClassesService: new MasterClassesService(),
};
