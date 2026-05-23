const NotFoundError = require('../src/shared/errors/NotFoundError');
const { AcademicYearsService } = require('../src/modules/academic-years/academic-years.service');

const createRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deactivateAll: jest.fn(),
  deactivateAllSemesters: jest.fn(),
  deactivateSemestersForYear: jest.fn(),
  updateInTransaction: jest.fn(),
  findMasterClasses: jest.fn(),
  findStudyGroupsByYear: jest.fn(),
  createStudyGroups: jest.fn(),
  transaction: jest.fn(async (callback) => callback({ tahunAjaran: {}, semester: {} })),
});

describe('AcademicYearsService', () => {
  test('toggleAcademicYear activates year transactionally and deactivates all semesters', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue({
      id: 'ta-1',
      kode: '2026/2027',
      deskripsi: 'Tahun Ajaran 2026/2027',
      is_active: false,
    });
    repository.updateInTransaction.mockResolvedValue({
      id: 'ta-1',
      kode: '2026/2027',
      deskripsi: 'Tahun Ajaran 2026/2027',
      is_active: true,
    });
    const service = new AcademicYearsService(repository);

    const result = await service.toggleAcademicYear('ta-1');

    expect(repository.transaction).toHaveBeenCalledTimes(1);
    expect(repository.deactivateAll).toHaveBeenCalled();
    expect(repository.deactivateAllSemesters).toHaveBeenCalled();
    expect(repository.updateInTransaction).toHaveBeenCalledWith(
      'ta-1',
      { is_active: true },
      expect.any(Object)
    );
    expect(result).toMatchObject({
      message: 'Tahun ajaran berhasil diaktifkan',
      data: { id: 'ta-1', isActive: true },
    });
  });

  test('toggleAcademicYear deactivates only related semesters when disabling active year', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue({
      id: 'ta-2',
      kode: '2025/2026',
      deskripsi: 'Tahun Ajaran 2025/2026',
      is_active: true,
    });
    repository.updateInTransaction.mockResolvedValue({
      id: 'ta-2',
      kode: '2025/2026',
      deskripsi: 'Tahun Ajaran 2025/2026',
      is_active: false,
    });
    const service = new AcademicYearsService(repository);

    const result = await service.toggleAcademicYear('ta-2');

    expect(repository.deactivateSemestersForYear).toHaveBeenCalledWith('ta-2', expect.any(Object));
    expect(repository.deactivateAllSemesters).not.toHaveBeenCalled();
    expect(result.data).toMatchObject({ id: 'ta-2', isActive: false });
  });

  test('generateStudyGroups only creates missing master classes', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue({
      id: 'ta-1',
      kode: '2026/2027',
      deskripsi: 'Tahun Ajaran 2026/2027',
      is_active: true,
    });
    repository.findMasterClasses.mockResolvedValue([
      { id: 'mk-1', nama: 'X-1' },
      { id: 'mk-2', nama: 'X-2' },
    ]);
    repository.findStudyGroupsByYear.mockResolvedValue([{ master_kelas_id: 'mk-1' }]);
    repository.createStudyGroups.mockResolvedValue({ count: 1 });
    const service = new AcademicYearsService(repository);

    const result = await service.generateStudyGroups('ta-1');

    expect(repository.createStudyGroups).toHaveBeenCalledWith([
      {
        master_kelas_id: 'mk-2',
        tahun_ajaran_id: 'ta-1',
        wali_kelas_id: null,
        ruang_kelas_id: null,
      },
    ]);
    expect(result).toMatchObject({
      tahunAjaranId: 'ta-1',
      totalMasterKelas: 2,
      rombelDibuat: 1,
    });
  });

  test('throws NotFoundError when year is missing', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(null);
    const service = new AcademicYearsService(repository);

    await expect(service.toggleAcademicYear('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
