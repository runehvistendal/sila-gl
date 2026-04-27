-- role_type + location manglede i nogle miljøer; dashboard og actions forventer dem.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role_type text;

UPDATE profiles
SET role_type = 'traveler'
WHERE role_type IS NULL;

ALTER TABLE profiles
  ALTER COLUMN role_type SET DEFAULT 'traveler';

ALTER TABLE profiles
  ALTER COLUMN role_type SET NOT NULL;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_type_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_type_check
  CHECK (role_type IN ('traveler', 'provider', 'both'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS location text;
