-- Gæsteanmodning: hytte i naturen vs. bolig i byen
ALTER TABLE cabin_requests
  ADD COLUMN IF NOT EXISTS desired_property_type text NOT NULL DEFAULT 'cabin'
  CHECK (desired_property_type IN ('cabin', 'residence'));

COMMENT ON COLUMN cabin_requests.desired_property_type IS 'cabin = ophold i naturen, residence = bolig i byen';
