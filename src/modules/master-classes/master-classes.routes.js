const express = require('express');
const masterClassesController = require('./master-classes.controller');
const { requireFields, validateUUID } = require('../../middlewares/validationMiddleware');

const router = express.Router();

router.get('/', masterClassesController.getAll);
router.post('/', requireFields('name', 'grade'), masterClassesController.create);
router.put('/:id', validateUUID('id'), masterClassesController.update);
router.delete('/:id', validateUUID('id'), masterClassesController.remove);

module.exports = router;
