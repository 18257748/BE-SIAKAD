const { SubjectsService } = require('../src/modules/subjects/subjects.service');

const createRepository = () => ({
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('SubjectsService', () => {
  test('listSubjects forwards search and maps SubjectDto', async () => {
    const repository = createRepository();
    repository.findAll.mockResolvedValue([
      {
        id: 'mapel-1',
        kode: 'MAT',
        nama: 'Matematika',
        kategori: 'Wajib',
        kkm: 75,
        deskripsi: 'Mapel wajib',
      },
    ]);
    const service = new SubjectsService(repository);

    await expect(service.listSubjects({ search: 'mat' })).resolves.toEqual([
      {
        id: 'mapel-1',
        code: 'MAT',
        name: 'Matematika',
        category: 'Wajib',
        kkm: 75,
        description: 'Mapel wajib',
      },
    ]);
    expect(repository.findAll).toHaveBeenCalledWith({ search: 'mat' });
  });

  test('createSubject applies default KKM and maps DTO', async () => {
    const repository = createRepository();
    repository.create.mockResolvedValue({
      id: 'mapel-1',
      kode: 'MAT',
      nama: 'Matematika',
      kategori: 'Wajib',
      kkm: 75,
      deskripsi: null,
    });
    const service = new SubjectsService(repository);

    const result = await service.createSubject({
      code: ' MAT ',
      name: ' Matematika ',
      category: ' Wajib ',
    });

    expect(repository.create).toHaveBeenCalledWith({
      kode: 'MAT',
      nama: 'Matematika',
      kategori: 'Wajib',
      kkm: 75,
      deskripsi: null,
    });
    expect(result).toMatchObject({ code: 'MAT', name: 'Matematika', kkm: 75 });
  });
});
