const express = require('express');
const semestersController = require('./semesters.controller');
const { requireFields, validateUUID } = require('../../middlewares/validationMiddleware');

const router = express.Router();

router.get('/', semestersController.getAll);
router.post('/', requireFields('name', 'academicYearId'), semestersController.create);
router.put('/:id', validateUUID('id'), semestersController.update);
router.patch('/:id/toggle', validateUUID('id'), semestersController.toggleActive);
router.delete('/:id', validateUUID('id'), semestersController.remove);

module.exports = router;
