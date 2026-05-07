// src/routes/promosiRoutes.js
// ═══════════════════════════════════════════════
// Kenaikan Kelas (Promosi) Routes
// ═══════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const promosiCtrl = require('../controllers/promosiController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { requireFields, validateUUID } = require('../middlewares/validationMiddleware');

router.use(verifyToken);

// GET /api/promosi/rombel/:id
// Accessible by Wali Kelas & Kurikulum
router.get('/rombel/:id', 
  authorizeRoles('Wali Kelas', 'Guru Mapel', 'Kurikulum', 'Administrator'),
  validateUUID('id'),
  promosiCtrl.getSiswaPromosi
);

// POST /api/promosi/lock
// Accessible by Wali Kelas (to lock decisions)
router.post('/lock', 
  authorizeRoles('Wali Kelas', 'Guru Mapel', 'Administrator'),
  requireFields('rombelId', 'decisions'), // decisions: [{ siswaId, status }]
  promosiCtrl.lockPromosi
);

// POST /api/promosi/unlock
// Membatalkan kunci agar Wali Kelas bisa mengubah keputusan kenaikan
router.post('/unlock',
  authorizeRoles('Wali Kelas', 'Guru Mapel', 'Administrator'),
  requireFields('rombelId'),
  promosiCtrl.unlockPromosi
);

// POST /api/promosi/execute
// Accessible by Kurikulum (to execute migration)
router.post('/execute', 
  authorizeRoles('Kurikulum', 'Administrator'),
  requireFields('rombelAsalId', 'rombelTujuanId', 'tahunAjaranBaruId', 'siswaIds'),
  promosiCtrl.executePromosi
);

module.exports = router;
