const { MasterClassesService } = require('../src/modules/master-classes/master-classes.service');

const createRepository = () => ({
  findActiveYear: jest.fn(),
  findAllTemplates: jest.fn(),
  findRombelByYear: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  createRombel: jest.fn(),
  upsertRombel: jest.fn(),
});

describe('MasterClassesService', () => {
  test('listMasterClasses combines template with active-year rombel assignment', async () => {
    const repository = createRepository();
    repository.findActiveYear.mockResolvedValue({ id: 'ta-aktif' });
    repository.findAllTemplates.mockResolvedValue([
      { id: 'mk-1', nama: 'X-1', tingkat: 'Kelas 10' },
    ]);
    repository.findRombelByYear.mockResolvedValue([
      {
        master_kelas_id: 'mk-1',
        wali_kelas_id: 'guru-1',
        ruang_kelas_id: 'ruang-1',
        wali_kelas: { nama_lengkap: 'Wali Rombel' },
        ruang_kelas: { kode: 'R-01' },
      },
    ]);
    const service = new MasterClassesService(repository);

    await expect(service.listMasterClasses()).resolves.toEqual([
      {
        id: 'mk-1',
        name: 'X-1',
        grade: 'Kelas 10',
        homeroomTeacher: 'Wali Rombel',
        homeroomTeacherId: 'guru-1',
        classroom: 'R-01',
        classroomId: 'ruang-1',
      },
    ]);
  });

  test('updateMasterClass upserts active-year rombel for wali and room assignment', async () => {
    const repository = createRepository();
    repository.updateTemplate.mockResolvedValue({ id: 'mk-1', nama: 'X-1', tingkat: 'Kelas 10' });
    repository.findActiveYear.mockResolvedValue({ id: 'ta-aktif' });
    repository.upsertRombel.mockResolvedValue({
      master_kelas_id: 'mk-1',
      wali_kelas_id: 'guru-1',
      ruang_kelas_id: 'ruang-1',
      wali_kelas: { nama_lengkap: 'Wali Rombel' },
      ruang_kelas: { kode: 'R-01' },
    });
    const service = new MasterClassesService(repository);

    const result = await service.updateMasterClass('mk-1', {
      homeroomTeacherId: 'guru-1',
      classroomId: 'ruang-1',
    });

    expect(repository.upsertRombel).toHaveBeenCalledWith({
      masterClassId: 'mk-1',
      academicYearId: 'ta-aktif',
      update: { wali_kelas_id: 'guru-1', ruang_kelas_id: 'ruang-1' },
      create: {
        master_kelas_id: 'mk-1',
        tahun_ajaran_id: 'ta-aktif',
        wali_kelas_id: 'guru-1',
        ruang_kelas_id: 'ruang-1',
      },
    });
    expect(result).toMatchObject({
      id: 'mk-1',
      homeroomTeacher: 'Wali Rombel',
      classroom: 'R-01',
    });
  });
});
