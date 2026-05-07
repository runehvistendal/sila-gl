-- Korttidsboligudlejning: property_type, bolig-underkategorier, badeværelser

ALTER TABLE cabins ADD COLUMN IF NOT EXISTS property_type TEXT NOT NULL DEFAULT 'cabin';

ALTER TABLE cabins DROP CONSTRAINT IF EXISTS cabins_property_type_check;
ALTER TABLE cabins ADD CONSTRAINT cabins_property_type_check
  CHECK (property_type IN ('cabin', 'residence'));

ALTER TABLE cabins ADD COLUMN IF NOT EXISTS residence_subtype TEXT;

ALTER TABLE cabins DROP CONSTRAINT IF EXISTS cabins_residence_subtype_check;
ALTER TABLE cabins ADD CONSTRAINT cabins_residence_subtype_check
  CHECK (
    residence_subtype IS NULL
    OR residence_subtype IN ('house', 'apartment', 'room', 'other')
  );

ALTER TABLE cabins ADD COLUMN IF NOT EXISTS location_subtype TEXT;

ALTER TABLE cabins DROP CONSTRAINT IF EXISTS cabins_location_subtype_check;
ALTER TABLE cabins ADD CONSTRAINT cabins_location_subtype_check
  CHECK (
    location_subtype IS NULL
    OR location_subtype IN ('city', 'village')
  );

ALTER TABLE cabins ADD COLUMN IF NOT EXISTS bathrooms INTEGER NOT NULL DEFAULT 1;
ALTER TABLE cabins ADD CONSTRAINT cabins_bathrooms_nonnegative CHECK (bathrooms >= 0);

COMMENT ON COLUMN cabins.property_type IS
  'cabin = hytte i naturen; residence = korttidsbolig (by/bygd).';
COMMENT ON COLUMN cabins.residence_subtype IS
  'Boligtype når property_type = residence; ellers NULL.';
COMMENT ON COLUMN cabins.location_subtype IS
  'city eller village når property_type = residence; ellers NULL.';
COMMENT ON COLUMN cabins.bathrooms IS
  'Antal badeværelser (korttidsbolig + hytte).';
