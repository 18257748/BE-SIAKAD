// src/routes/dashboardRoutes.js
// ═══════════════════════════════════════════════
// DASHBOARD ROUTES
// Role-specific dashboard endpoints
// ═══════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const dashboardCtrl = require('../controllers/dashboardController');
const semestersController = require('../modules/semesters/semesters.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

// Admin dashboard stats
router.get('/stats', 
  verifyToken, 
  authorizeRoles('Administrator'),
  dashboardCtrl.getStats
);

// Kurikulum dashboard stats
router.get('/kurikulum',
  verifyToken,
  authorizeRoles('Kurikulum', 'Administrator'),
  dashboardCtrl.getKurikulumDashboard
);

// Wali Kelas dashboard
router.get('/wali-kelas', 
  verifyToken, 
  authorizeRoles('Wali Kelas', 'Guru Mapel'),
  dashboardCtrl.getWaliKelasDashboard
);

router.get('/wali-kelas/kehadiran-mapel',
  verifyToken,
  authorizeRoles('Wali Kelas', 'Guru Mapel'),
  dashboardCtrl.getWaliKelasKehadiranMapel
);

// Siswa dashboard
router.get('/siswa', 
  verifyToken, 
  authorizeRoles('Siswa'),
  dashboardCtrl.getSiswaDashboard
);

// Guru dashboard
router.get('/guru', 
  verifyToken, 
  authorizeRoles('Guru Mapel', 'Wali Kelas'),
  dashboardCtrl.getGuruDashboard
);

// Guru class detail
router.get('/guru/kelas/:id',
  verifyToken,
  authorizeRoles('Guru Mapel', 'Wali Kelas'),
  dashboardCtrl.getGuruClassDetail
);

// Guru quick session — Dashboard shortcut for opening attendance
router.post('/guru/quick-session',
  verifyToken,
  authorizeRoles('Guru Mapel', 'Wali Kelas'),
  dashboardCtrl.quickSession
);

// ─── Active Semester (semua role yang sudah login) ──────────────
// No authorizeRoles — any authenticated user can call this
router.get('/active-semester', verifyToken, semestersController.getActive);

module.exports = router;
