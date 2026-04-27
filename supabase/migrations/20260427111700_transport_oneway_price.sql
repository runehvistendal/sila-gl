-- Sørg for at enkeltbillet-øre-kolonnen findes (kan være oprettet i initial schema)
ALTER TABLE cabins
  ADD COLUMN IF NOT EXISTS transport_price_per_person_ore integer;
