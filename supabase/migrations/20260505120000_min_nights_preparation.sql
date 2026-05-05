ALTER TABLE cabins
  ADD COLUMN IF NOT EXISTS min_nights INTEGER NOT NULL DEFAULT 1 CHECK (min_nights >= 1),
  ADD COLUMN IF NOT EXISTS preparation_days INTEGER NOT NULL DEFAULT 0 CHECK (preparation_days IN (0, 1, 2, 3));
