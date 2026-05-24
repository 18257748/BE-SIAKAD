-- Prevent future duplicate teaching journals for the same schedule and date.
-- This is implemented as a trigger instead of a unique index so deployment does
-- not fail if older production data already contains duplicate same-day rows.

CREATE OR REPLACE FUNCTION prevent_duplicate_daily_jurnal_mengajar()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "JurnalMengajar" jm
    WHERE jm."jadwal_id" = NEW."jadwal_id"
      AND jm."semester_id" = NEW."semester_id"
      AND jm."tanggal" = NEW."tanggal"
      AND jm."id" <> NEW."id"
  ) THEN
    RAISE EXCEPTION 'Jurnal untuk jadwal dan tanggal ini sudah ada'
      USING ERRCODE = '23505',
            CONSTRAINT = 'JurnalMengajar_jadwal_id_semester_id_tanggal_key';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_duplicate_daily_jurnal_mengajar_trigger ON "JurnalMengajar";

CREATE TRIGGER prevent_duplicate_daily_jurnal_mengajar_trigger
BEFORE INSERT OR UPDATE OF "jadwal_id", "semester_id", "tanggal"
ON "JurnalMengajar"
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_daily_jurnal_mengajar();
