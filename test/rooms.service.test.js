const ValidationError = require('../src/shared/errors/ValidationError');
const { RoomsService } = require('../src/modules/rooms/rooms.service');

const createRepository = () => ({
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('RoomsService', () => {
  test('listRooms maps Prisma records to room DTOs', async () => {
    const repository = createRepository();
    repository.findAll.mockResolvedValue([
      { id: 'room-001', kode: 'R-101', gedung: 'A', kapasitas: 32 },
    ]);
    const service = new RoomsService(repository);

    await expect(service.listRooms()).resolves.toEqual([
      { id: 'room-001', code: 'R-101', building: 'A', capacity: 32 },
    ]);
    expect(repository.findAll).toHaveBeenCalledWith();
  });

  test('createRoom validates and sends database fields to repository', async () => {
    const repository = createRepository();
    repository.create.mockResolvedValue({
      id: 'room-001',
      kode: 'R-101',
      gedung: 'A',
      kapasitas: 32,
    });
    const service = new RoomsService(repository);

    const result = await service.createRoom({
      code: ' R-101 ',
      building: ' A ',
      capacity: '32',
    });

    expect(repository.create).toHaveBeenCalledWith({
      kode: 'R-101',
      gedung: 'A',
      kapasitas: 32,
    });
    expect(result).toEqual({
      id: 'room-001',
      code: 'R-101',
      building: 'A',
      capacity: 32,
    });
  });

  test('createRoom rejects invalid capacity before repository call', async () => {
    const repository = createRepository();
    const service = new RoomsService(repository);

    await expect(service.createRoom({
      code: 'R-101',
      building: 'A',
      capacity: 0,
    })).rejects.toBeInstanceOf(ValidationError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  test('updateRoom maps partial fields', async () => {
    const repository = createRepository();
    repository.update.mockResolvedValue({
      id: 'room-001',
      kode: 'R-201',
      gedung: 'B',
      kapasitas: 36,
    });
    const service = new RoomsService(repository);

    const result = await service.updateRoom('room-001', {
      code: 'R-201',
      capacity: '36',
    });

    expect(repository.update).toHaveBeenCalledWith('room-001', {
      kode: 'R-201',
      kapasitas: 36,
    });
    expect(result).toEqual({
      id: 'room-001',
      code: 'R-201',
      building: 'B',
      capacity: 36,
    });
  });

  test('deleteRoom delegates to repository', async () => {
    const repository = createRepository();
    const service = new RoomsService(repository);

    await service.deleteRoom('room-001');

    expect(repository.delete).toHaveBeenCalledWith('room-001');
  });
});
