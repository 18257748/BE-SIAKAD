const { toCreateRoomData, toUpdateRoomData } = require('./rooms.dto');
const { toRoomDto } = require('./rooms.mapper');
const { roomsRepository } = require('./rooms.repository');
const { validateRequiredRoomFields, validateUpdateRoomFields } = require('./rooms.validation');

class RoomsService {
  constructor(repository = roomsRepository) {
    this.repository = repository;
  }

  async listRooms() {
    const rooms = await this.repository.findAll();
    return rooms.map(toRoomDto);
  }

  async createRoom(input) {
    validateRequiredRoomFields(input);
    const room = await this.repository.create(toCreateRoomData(input));
    return toRoomDto(room);
  }

  async updateRoom(id, input) {
    validateUpdateRoomFields(input);
    const data = toUpdateRoomData(input);
    const room = await this.repository.update(id, data);
    return toRoomDto(room);
  }

  async deleteRoom(id) {
    await this.repository.delete(id);
  }
}

module.exports = { RoomsService, roomsService: new RoomsService() };
