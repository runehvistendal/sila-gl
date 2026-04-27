ALTER TABLE cabins
  ADD COLUMN IF NOT EXISTS transport_price_per_person_ore integer,
  ADD COLUMN IF NOT EXISTS transport_price_roundtrip_ore integer;
