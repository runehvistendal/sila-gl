ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.profiles.bio IS 'Valgfri bruger-bio (max 500 tegn i app)';
COMMENT ON COLUMN public.profiles.phone IS 'Valgfri telefon (ikke vist offentligt uden eget valg)';
