-- Profil: by (location_id) + foretrukket sprog (language)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS location_id text;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'da';

UPDATE profiles
SET language = 'da'
WHERE language IS NULL;

ALTER TABLE profiles
  ALTER COLUMN language SET NOT NULL;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_language_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_language_check
  CHECK (language IN ('da', 'en', 'kl'));
