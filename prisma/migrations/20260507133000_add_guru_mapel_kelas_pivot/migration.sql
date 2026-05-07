-- Add normalized pivot table for GuruMapel <-> MasterKelas.
-- Legacy kelas_diampu stays in place for backward compatibility during transition.

CREATE TABLE "GuruMapelKelas" (
    "id" TEXT NOT NULL,
    "guru_mapel_id" TEXT NOT NULL,
    "master_kelas_id" TEXT NOT NULL,

    CONSTRAINT "GuruMapelKelas_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GuruMapelKelas"
  ADD CONSTRAINT "GuruMapelKelas_guru_mapel_id_fkey"
  FOREIGN KEY ("guru_mapel_id") REFERENCES "GuruMapel"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuruMapelKelas"
  ADD CONSTRAINT "GuruMapelKelas_master_kelas_id_fkey"
  FOREIGN KEY ("master_kelas_id") REFERENCES "MasterKelas"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "GuruMapelKelas_guru_mapel_id_master_kelas_id_key"
  ON "GuruMapelKelas"("guru_mapel_id", "master_kelas_id");

CREATE INDEX "GuruMapelKelas_master_kelas_id_idx"
  ON "GuruMapelKelas"("master_kelas_id");

-- Backfill the pivot from legacy comma-separated kelas_diampu values.
-- Names that cannot be matched to MasterKelas.nama are skipped and logged below for manual review.
WITH parsed AS (
  SELECT
    gm.id AS guru_mapel_id,
    trim(class_name) AS kelas_nama
  FROM "GuruMapel" gm
  CROSS JOIN LATERAL regexp_split_to_table(COALESCE(gm.kelas_diampu, ''), ',') AS class_name
  WHERE trim(class_name) <> ''
),
matched AS (
  SELECT DISTINCT
    p.guru_mapel_id,
    mk.id AS master_kelas_id
  FROM parsed p
  JOIN "MasterKelas" mk
    ON mk.nama = p.kelas_nama
)
INSERT INTO "GuruMapelKelas" ("id", "guru_mapel_id", "master_kelas_id")
SELECT gen_random_uuid()::text, m.guru_mapel_id, m.master_kelas_id
FROM matched m
ON CONFLICT ("guru_mapel_id", "master_kelas_id") DO NOTHING;

DO $$
DECLARE
  r record;
  unmatched_name text;
BEGIN
  FOR r IN
    SELECT id, kelas_diampu
    FROM "GuruMapel"
    WHERE COALESCE(kelas_diampu, '') <> ''
  LOOP
    FOR unmatched_name IN
      SELECT trim(class_name)
      FROM regexp_split_to_table(r.kelas_diampu, ',') AS class_name
      WHERE trim(class_name) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM "MasterKelas" mk
          WHERE mk.nama = trim(class_name)
        )
    LOOP
      RAISE NOTICE 'GuruMapel % memiliki kelas_diampu yang tidak cocok dengan MasterKelas.nama: %',
        r.id, unmatched_name;
    END LOOP;
  END LOOP;
END $$;
