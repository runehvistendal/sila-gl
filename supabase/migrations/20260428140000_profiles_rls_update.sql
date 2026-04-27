-- RLS: sikr at authenticated brugere kan opdatere egen profil (fx role_type),
-- hvis en remote database mangler en tilsvarende politik.
-- (Initial migration har allerede "profiles_update_owner" med samme idé.)
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END
$migration$;
