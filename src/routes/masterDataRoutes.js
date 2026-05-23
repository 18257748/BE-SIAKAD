// src/routes/masterDataRoutes.js
// ═══════════════════════════════════════════════
// MASTER DATA ROUTES
// Tahun Ajaran, Semester, Ruang Kelas, Master Kelas
// (Admin only)
// ═══════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const academicYearsRoutes = require('../modules/academic-years/academic-years.routes');
const semestersRoutes = require('../modules/semesters/semesters.routes');
const semestersController = require('../modules/semesters/semesters.controller');
const roomsRoutes = require('../modules/rooms/rooms.routes');
const masterClassesRoutes = require('../modules/master-classes/master-classes.routes');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

// ── Public (authenticated) — active semester for navbar ──
// Must be BEFORE the authorizeRoles middleware below
router.get('/active-semester', verifyToken, semestersController.getActive);

// All routes BELOW require Admin and Kurikulum roles
router.get('/semester', verifyToken, semestersController.getAll);
router.use(verifyToken, authorizeRoles('Administrator', 'Kurikulum'));

// ── Tahun Ajaran ────────────────────────────────
router.use('/tahun-ajaran', academicYearsRoutes);

// ── Semester ────────────────────────────────────
router.use('/semester', semestersRoutes);

// ── Ruang Kelas ─────────────────────────────────
router.use('/ruang-kelas', roomsRoutes);

// ── Master Kelas ────────────────────────────────
router.use('/master-kelas', masterClassesRoutes);

module.exports = router;
