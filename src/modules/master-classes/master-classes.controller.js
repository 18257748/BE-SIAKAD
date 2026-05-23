const { asyncHandler } = require('../../shared/http/asyncHandler');
const { sendCreated, sendNoContent, sendSuccess } = require('../../shared/http/response');
const { masterClassesService } = require('./master-classes.service');

const createMasterClassesController = (service = masterClassesService) => ({
  getAll: asyncHandler(async (req, res) => {
    const data = await service.listMasterClasses();
    return sendSuccess(res, { message: 'Data master kelas berhasil diambil', data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await service.createMasterClass(req.body);
    return sendCreated(res, { message: 'Master kelas berhasil ditambahkan', data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await service.updateMasterClass(req.params.id, req.body);
    return sendSuccess(res, { message: 'Master kelas berhasil diperbarui', data });
  }),

  remove: asyncHandler(async (req, res) => {
    await service.deleteMasterClass(req.params.id);
    return sendNoContent(res, { message: 'Master kelas berhasil dihapus' });
  }),
});

module.exports = createMasterClassesController();
module.exports.createMasterClassesController = createMasterClassesController;
