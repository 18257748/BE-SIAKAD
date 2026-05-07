-- Move schedule and journal uniqueness to semester scope.
-- Older databases created JadwalPelajaran and JurnalMengajar before semester_id
-- existed on those tables, so this migration also backfills the required columns.

ALTER TABLE "JadwalPelajaran"
  ADD COLUMN IF NOT EXISTS "semester_id" TEXT;

UPDATE "JadwalPelajaran"
SET "semester_id" = COALESCE(
  "semester_id",
  (SELECT id FROM "Semester" WHERE is_active = true LIMIT 1),
  (SELECT id FROM "Semester" ORDER BY id LIMIT 1)
)
WHERE "semester_id" IS NULL;

ALTER TABLE "JadwalPelajaran"
  ALTER COLUMN "semester_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'JadwalPelajaran_semester_id_fkey'
  ) THEN
    ALTER TABLE "JadwalPelajaran"
      ADD CONSTRAINT "JadwalPelajaran_semester_id_fkey"
      FOREIGN KEY ("semester_id") REFERENCES "Semester"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS "JadwalPelajaran_master_kelas_id_hari_slot_index_key";

CREATE UNIQUE INDEX IF NOT EXISTS "JadwalPelajaran_semester_id_master_kelas_id_hari_slot_index_key"
  ON "JadwalPelajaran"("semester_id", "master_kelas_id", "hari", "slot_index");

ALTER TABLE "JurnalMengajar"
  ADD COLUMN IF NOT EXISTS "semester_id" TEXT;

UPDATE "JurnalMengajar" AS jm
SET "semester_id" = jp."semester_id"
FROM "JadwalPelajaran" AS jp
WHERE jm."jadwal_id" = jp."id"
  AND jm."semester_id" IS NULL;

ALTER TABLE "JurnalMengajar"
  ALTER COLUMN "semester_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'JurnalMengajar_semester_id_fkey'
  ) THEN
    ALTER TABLE "JurnalMengajar"
      ADD CONSTRAINT "JurnalMengajar_semester_id_fkey"
      FOREIGN KEY ("semester_id") REFERENCES "Semester"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "JurnalMengajar"
  DROP CONSTRAINT IF EXISTS "JurnalMengajar_jadwal_id_pertemuan_ke_key";

DROP INDEX IF EXISTS "JurnalMengajar_jadwal_id_pertemuan_ke_key";

CREATE UNIQUE INDEX IF NOT EXISTS "JurnalMengajar_jadwal_id_semester_id_pertemuan_ke_key"
  ON "JurnalMengajar"("jadwal_id", "semester_id", "pertemuan_ke");
