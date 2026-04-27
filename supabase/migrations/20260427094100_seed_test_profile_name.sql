-- Seed full_name for test profile (email lives in auth.users, not profiles)
UPDATE profiles
SET full_name = 'Rune Kristiansen'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'rune.runesen.test@gmail.com'
);
