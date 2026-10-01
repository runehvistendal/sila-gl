-- Sila.gl — udbyderes offentlige profil kan læses uden login
--
-- 20260427020000_security_audit gav anon kolonneadgang til de sikre felter
-- (id, full_name, avatar_url, bio, role_type, location), men der fandtes ingen
-- RLS-politik for anon. Resultat: besøgende uden login (og søgemaskiner) så
-- aldrig værtens eller sejlerens navn — «Din vært» manglede på hyttesiden, og
-- alle sejladser stod som «Sila-sejler».
--
-- Kun udbydere (har selv valgt at slå noget op) bliver synlige. Rene gæsteprofiler
-- forbliver skjult for anon. Følsomme kolonner (phone, stripe_*) er fortsat ikke
-- givet til anon og kan ikke læses.

DROP POLICY IF EXISTS profiles_select_public_providers ON public.profiles;
CREATE POLICY profiles_select_public_providers
  ON public.profiles FOR SELECT
  TO anon
  USING (deleted_at IS NULL AND role_type IN ('provider', 'both'));
