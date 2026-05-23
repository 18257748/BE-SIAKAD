const { asyncHandler } = require('../../shared/http/asyncHandler');
const { sendCreated, sendNoContent, sendSuccess } = require('../../shared/http/response');
const { academicYearsService } = require('./academic-years.service');

const createAcademicYearsController = (service = academicYearsService) => ({
  getAll: asyncHandler(async (req, res) => {
    const data = await service.listAcademicYears();
    return sendSuccess(res, { message: 'Data tahun ajaran berhasil diambil', data });
  }),

  create: asyncHandler(async (req, res) => {
    const data = await service.createAcademicYear(req.body);
    return sendCreated(res, { message: 'Tahun ajaran berhasil ditambahkan', data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await service.updateAcademicYear(req.params.id, req.body);
    return sendSuccess(res, { message: 'Tahun ajaran berhasil diperbarui', data });
  }),

  toggleActive: asyncHandler(async (req, res) => {
    const result = await service.toggleAcademicYear(req.params.id);
    return sendSuccess(res, result);
  }),

  generateRombel: asyncHandler(async (req, res) => {
    const data = await service.generateStudyGroups(req.params.id);
    return sendSuccess(res, { message: 'Generate rombel berhasil', data });
  }),

  remove: asyncHandler(async (req, res) => {
    await service.deleteAcademicYear(req.params.id);
    return sendNoContent(res, { message: 'Tahun ajaran berhasil dihapus' });
  }),
});

module.exports = createAcademicYearsController();
module.exports.createAcademicYearsController = createAcademicYearsController;
