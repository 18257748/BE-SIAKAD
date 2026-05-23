const AppError = require('../src/shared/errors/AppError');
const { SemestersService } = require('../src/modules/semesters/semesters.service');

const createRepository = () => ({
  findAll: jest.fn(),
  findActive: jest.fn(),
  findById: jest.fn(),
  findAcademicYearById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deactivateAll: jest.fn(),
  transaction: jest.fn(async (callback) => callback({ semester: {} })),
});

describe('SemestersService', () => {
  test('toggleSemester rejects activation when academic year is inactive', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue({
      id: 'sem-1',
      nama: 'Semester Ganjil',
      tahun_ajaran_id: 'ta-1',
      is_active: false,
      tahun_ajaran: { id: 'ta-1', kode: '2026/2027', is_active: false },
    });
    const service = new SemestersService(repository);

    await expect(service.toggleSemester('sem-1')).rejects.toMatchObject({
      code: 'SEMESTER_YEAR_MISMATCH',
      statusCode: 400,
    });
    expect(repository.transaction).not.toHaveBeenCalled();
  });

  test('toggleSemester activates one semester and deactivates all others', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue({
      id: 'sem-1',
      nama: 'Semester Ganjil',
      tahun_ajaran_id: 'ta-1',
      is_active: false,
      tahun_ajaran: { id: 'ta-1', kode: '2026/2027', is_active: true },
    });
    repository.update.mockResolvedValue({
      id: 'sem-1',
      nama: 'Semester Ganjil',
      tahun_ajaran_id: 'ta-1',
      is_active: true,
      tahun_ajaran: { kode: '2026/2027' },
    });
    const service = new SemestersService(repository);

    const result = await service.toggleSemester('sem-1');

    expect(repository.deactivateAll).toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(
      'sem-1',
      { is_active: true },
      expect.any(Object)
    );
    expect(result).toMatchObject({
      message: 'Semester berhasil diaktifkan',
      data: { id: 'sem-1', isActive: true },
    });
  });

  test('createSemester validates active academic year when creating active semester', async () => {
    const repository = createRepository();
    repository.findAcademicYearById.mockResolvedValue({
      id: 'ta-1',
      kode: '2026/2027',
      is_active: false,
    });
    const service = new SemestersService(repository);

    await expect(service.createSemester({
      name: 'Semester Ganjil',
      academicYearId: 'ta-1',
      isActive: true,
    })).rejects.toBeInstanceOf(AppError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  test('getActiveSemester maps active semester alias DTO', async () => {
    const repository = createRepository();
    repository.findActive.mockResolvedValue({
      id: 'sem-1',
      nama: 'Semester Ganjil',
      tahun_ajaran: { kode: '2026/2027' },
    });
    const service = new SemestersService(repository);

    await expect(service.getActiveSemester()).resolves.toEqual({
      id: 'sem-1',
      nama: 'Semester Ganjil',
      tahunAjaran: '2026/2027',
      label: 'Semester Ganjil - 2026/2027',
    });
  });
});
