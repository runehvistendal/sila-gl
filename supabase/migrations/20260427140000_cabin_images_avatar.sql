-- Idempotent: kolonner kan allerede findes i initialskema
ALTER TABLE public.cabins
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.cabins.images IS 'Cloudinary-URLer (først = forsidebillede)';
COMMENT ON COLUMN public.profiles.avatar_url IS 'Cloudinary-URL (kvadratisk, afledt)';
