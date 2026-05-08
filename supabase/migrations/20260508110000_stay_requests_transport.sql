-- Gæst kan angive behov for transport til/fra opholdet på opholdsanmodning.

ALTER TABLE public.stay_requests
  ADD COLUMN IF NOT EXISTS needs_transport boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.stay_requests.needs_transport IS
  'Gæst ønsker transport til/fra opholdet (hint til udbydere).';
