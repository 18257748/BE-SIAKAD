-- Backfill active rombel data from master kelas before removing legacy fallback.
-- Only active academic year rows are touched so historical rombel data stays unchanged.

UPDATE "Rombel" AS r
SET
  wali_kelas_id = COALESCE(r.wali_kelas_id, mk.wali_kelas_id),
  ruang_kelas_id = COALESCE(r.ruang_kelas_id, mk.ruang_kelas_id)
FROM "MasterKelas" AS mk,
     "TahunAjaran" AS ta
WHERE r.master_kelas_id = mk.id
  AND r.tahun_ajaran_id = ta.id
  AND ta.is_active = true
  AND (r.wali_kelas_id IS NULL OR r.ruang_kelas_id IS NULL);
