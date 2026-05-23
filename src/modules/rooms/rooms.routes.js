const express = require('express');
const roomsController = require('./rooms.controller');
const { requireFields, validateUUID } = require('../../middlewares/validationMiddleware');

const router = express.Router();

router.get('/', roomsController.getAll);
router.post(
  '/',
  requireFields('code', 'building', 'capacity'),
  roomsController.create
);
router.put('/:id', validateUUID('id'), roomsController.update);
router.delete('/:id', validateUUID('id'), roomsController.remove);

module.exports = router;
