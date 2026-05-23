const { asyncHandler } = require('../../shared/http/asyncHandler');
const { sendCreated, sendNoContent, sendSuccess } = require('../../shared/http/response');
const { subjectsService } = require('./subjects.service');

const createSubjectsController = (service = subjectsService) => ({
  getAll: asyncHandler(async (req, res) => {
    const data = await service.listSubjects(req.query);
    return sendSuccess(res, { message: 'Data mata pelajaran berhasil diambil', data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await service.createSubject(req.body);
    return sendCreated(res, { message: 'Mata pelajaran berhasil ditambahkan', data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await service.updateSubject(req.params.id, req.body);
    return sendSuccess(res, { message: 'Mata pelajaran berhasil diperbarui', data });
  }),

  remove: asyncHandler(async (req, res) => {
    await service.deleteSubject(req.params.id);
    return sendNoContent(res, { message: 'Mata pelajaran berhasil dihapus' });
  }),
});

module.exports = createSubjectsController();
module.exports.createSubjectsController = createSubjectsController;
