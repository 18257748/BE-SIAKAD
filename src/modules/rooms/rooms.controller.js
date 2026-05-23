const { asyncHandler } = require('../../shared/http/asyncHandler');
const { sendCreated, sendNoContent, sendSuccess } = require('../../shared/http/response');
const { roomsService } = require('./rooms.service');

const createRoomsController = (service = roomsService) => ({
  getAll: asyncHandler(async (req, res) => {
    const data = await service.listRooms();
    return sendSuccess(res, {
      message: 'Data ruang kelas berhasil diambil',
      data,
    });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await service.createRoom(req.body);
    return sendCreated(res, {
      message: 'Ruang kelas berhasil ditambahkan',
      data,
    });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await service.updateRoom(req.params.id, req.body);
    return sendSuccess(res, {
      message: 'Ruang kelas berhasil diperbarui',
      data,
    });
  }),

  remove: asyncHandler(async (req, res) => {
    await service.deleteRoom(req.params.id);
    return sendNoContent(res, { message: 'Ruang kelas berhasil dihapus' });
  }),
});

module.exports = createRoomsController();
module.exports.createRoomsController = createRoomsController;
