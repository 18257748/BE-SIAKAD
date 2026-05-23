const express = require('express');
const academicYearsController = require('./academic-years.controller');
const {
  requireFields,
  validateTahunAjaranCode,
  validateUUID,
} = require('../../middlewares/validationMiddleware');

const router = express.Router();

router.get('/', academicYearsController.getAll);
router.post(
  '/',
  requireFields('code', 'description'),
  validateTahunAjaranCode,
  academicYearsController.create
);
router.put('/:id', validateUUID('id'), academicYearsController.update);
router.patch('/:id/toggle', validateUUID('id'), academicYearsController.toggleActive);
router.post('/:id/generate-rombel', validateUUID('id'), academicYearsController.generateRombel);
router.delete('/:id', validateUUID('id'), academicYearsController.remove);

module.exports = router;
