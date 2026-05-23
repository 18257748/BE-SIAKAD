// src/app.js
// ═══════════════════════════════════════════════
// SIAKAD SMAN 1 Cikalong — Express Server
// ═══════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// ─── Middleware Imports ─────────────────────────
const { requestLogger } = require('./middlewares/requestLogger');
const { sanitizeAll } = require('./middlewares/sanitizeMiddleware');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { globalErrorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { requestIdMiddleware } = require('./shared/http/requestId');
const { sendSuccess } = require('./shared/http/response');

const app = express();

// ─── Global Middleware (order matters!) ─────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestIdMiddleware);
app.use(requestLogger);       // Log semua request
app.use(sanitizeAll);          // Sanitasi XSS di body/query/params
app.use('/api', apiLimiter);   // Rate limit seluruh API

// ─── Static Files (uploads) ────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Routes Registration ───────────────────────

// Auth & User Management
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));

// Master Data (Admin)
app.use('/api/master', require('./routes/masterDataRoutes'));

// Akademik (Kurikulum)
app.use('/api/mata-pelajaran', require('./routes/mataPelajaranRoutes'));
app.use('/api/guru-mapel', require('./routes/guruMapelRoutes'));
app.use('/api/rombel', require('./routes/rombelRoutes'));
app.use('/api/promosi', require('./routes/promosiRoutes'));
app.use('/api/jadwal', require('./routes/jadwalRoutes'));

// Kehadiran & Nilai (Guru/Siswa)
app.use('/api/kehadiran', require('./routes/kehadiranRoutes'));
app.use('/api/nilai', require('./routes/nilaiRoutes'));

// Jurnal Mengajar (Guru) — NEW
app.use('/api/jurnal', require('./routes/jurnalRoutes'));

// Catatan Akademik (Wali Kelas) — NEW
app.use('/api/catatan-akademik', require('./routes/catatanAkademikRoutes'));

// E-Rapor PDF (Wali Kelas/Admin) — NEW
app.use('/api/rapor', require('./routes/raporRoutes'));

// Dashboard (Role-specific)
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// CMS / Konten Publik — NEW
app.use('/api/cms', require('./routes/cmsRoutes'));

// File Upload — NEW
app.use('/api/upload', require('./routes/uploadRoutes'));

// CSV/Excel Import — NEW
app.use('/api/import', require('./routes/importRoutes'));

// ─── Health Check ───────────────────────────────
app.get('/api/health', (req, res) => {
  return sendSuccess(res, {
    message: 'SIAKAD Backend is running',
    data: {
      message: 'SIAKAD Backend is running',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── 404 Handler ────────────────────────────────
app.use(notFoundHandler);

// ─── Global Error Handler (MUST be last) ────────
app.use(globalErrorHandler);

module.exports = app;
