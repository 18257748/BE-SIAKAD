const express = require('express');
const subjectsController = require('./subjects.controller');
const {
  requireFields,
  validateMapelCategory,
  validateUUID,
} = require('../../middlewares/validationMiddleware');

const router = express.Router();

router.get('/', subjectsController.getAll);
router.post(
  '/',
  requireFields('code', 'name', 'category'),
  validateMapelCategory,
  subjectsController.create
);
router.put('/:id', validateUUID('id'), subjectsController.update);
router.delete('/:id', validateUUID('id'), subjectsController.remove);

module.exports = router;
