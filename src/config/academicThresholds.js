// src/config/academicThresholds.js
// ═══════════════════════════════════════════════
// Centralized academic thresholds — single source of truth.
// All controllers that evaluate student attendance or grades
// MUST reference these constants instead of hard-coding numbers.
// ═══════════════════════════════════════════════

module.exports = {
  /**
   * Minimum attendance rate (%) required to pass (naik kelas).
   * Used by: promosiController → getSiswaPromosi
   */
  MIN_ATTENDANCE_RATE: 80,

  /**
   * Attendance rate (%) below which a student is flagged on the dashboard.
   * Must equal MIN_ATTENDANCE_RATE so dashboard warnings and
   * promotion decisions are always consistent.
   * Used by: dashboardController → getWaliKelasDashboard, getGuruMapelDashboard
   */
  FLAG_ATTENDANCE_RATE: 80,

  /**
   * Minimum average grade required to pass (naik kelas).
   * Used by: promosiController → getSiswaPromosi
   */
  MIN_AVERAGE_GRADE: 75,
};
