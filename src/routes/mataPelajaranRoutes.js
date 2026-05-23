// src/routes/mataPelajaranRoutes.js
// ═══════════════════════════════════════════════
// MATA PELAJARAN ROUTES (Admin + Kurikulum)
// ═══════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const subjectsRoutes = require('../modules/subjects/subjects.routes');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

router.use(verifyToken, authorizeRoles('Administrator', 'Kurikulum'));

router.use('/', subjectsRoutes);

module.exports = router;
