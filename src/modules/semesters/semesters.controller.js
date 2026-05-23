const { asyncHandler } = require('../../shared/http/asyncHandler');
const { sendCreated, sendNoContent, sendSuccess } = require('../../shared/http/response');
const { semestersService } = require('./semesters.service');

const createSemestersController = (service = semestersService) => ({
  getAll: asyncHandler(async (req, res) => {
    const data = await service.listSemesters();
    return sendSuccess(res, { message: 'Data semester berhasil diambil', data });
  }),

  getActive: asyncHandler(async (req, res) => {
    const data = await service.getActiveSemester();
    return sendSuccess(res, {
      message: data ? 'Semester aktif berhasil diambil' : 'Tidak ada semester aktif',
      data,
    });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await service.createSemester(req.body);
    return sendCreated(res, { message: 'Semester berhasil ditambahkan', data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await service.updateSemester(req.params.id, req.body);
    return sendSuccess(res, { message: 'Semester berhasil diperbarui', data });
  }),

  toggleActive: asyncHandler(async (req, res) => {
    const result = await service.toggleSemester(req.params.id);
    return sendSuccess(res, result);
  }),

  remove: asyncHandler(async (req, res) => {
    await service.deleteSemester(req.params.id);
    return sendNoContent(res, { message: 'Semester berhasil dihapus' });
  }),
});

module.exports = createSemestersController();
module.exports.createSemestersController = createSemestersController;
