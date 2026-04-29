-- cabin_requests: gæsters ønsker om hytteleje
-- Bruges i "Mine ønsker" (gæst) og "Gæsteønsker" (udbyder)

CREATE TABLE IF NOT EXISTS cabin_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Valgfri kobling til specifik hytte (NULL = generelt ønske)
  cabin_id          uuid REFERENCES cabins(id) ON DELETE SET NULL,
  location          text NOT NULL,           -- ønsket destination
  desired_check_in  date NOT NULL,
  desired_check_out date NOT NULL,
  num_guests        integer NOT NULL DEFAULT 1 CHECK (num_guests >= 1),
  max_price_ore     integer,                 -- valgfrit budget i øre
  description       text,
  status            text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'matched', 'cancelled', 'expired')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

-- Indekser
CREATE INDEX IF NOT EXISTS cabin_requests_guest_id_idx    ON cabin_requests(guest_id);
CREATE INDEX IF NOT EXISTS cabin_requests_cabin_id_idx    ON cabin_requests(cabin_id);
CREATE INDEX IF NOT EXISTS cabin_requests_location_idx    ON cabin_requests(location);
CREATE INDEX IF NOT EXISTS cabin_requests_status_idx      ON cabin_requests(status);
CREATE INDEX IF NOT EXISTS cabin_requests_deleted_at_idx  ON cabin_requests(deleted_at);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_cabin_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cabin_requests_updated_at ON cabin_requests;
CREATE TRIGGER cabin_requests_updated_at
  BEFORE UPDATE ON cabin_requests
  FOR EACH ROW EXECUTE FUNCTION update_cabin_requests_updated_at();

-- RLS
ALTER TABLE cabin_requests ENABLE ROW LEVEL SECURITY;

-- Gæst kan se egne anmodninger
CREATE POLICY "cabin_requests_guest_select"
  ON cabin_requests FOR SELECT
  USING (
    guest_id = auth.uid()
    AND deleted_at IS NULL
  );

-- Hytte-ejere kan se anmodninger til deres hytter
CREATE POLICY "cabin_requests_owner_select"
  ON cabin_requests FOR SELECT
  USING (
    cabin_id IN (
      SELECT id FROM cabins WHERE owner_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Alle kan se åbne generelle anmodninger (cabin_id IS NULL)
CREATE POLICY "cabin_requests_open_select"
  ON cabin_requests FOR SELECT
  USING (
    cabin_id IS NULL
    AND status = 'open'
    AND deleted_at IS NULL
  );

-- Gæst kan oprette egne anmodninger
CREATE POLICY "cabin_requests_insert"
  ON cabin_requests FOR INSERT
  WITH CHECK (guest_id = auth.uid());

-- Gæst kan opdatere/annullere egne åbne anmodninger
CREATE POLICY "cabin_requests_guest_update"
  ON cabin_requests FOR UPDATE
  USING (guest_id = auth.uid())
  WITH CHECK (guest_id = auth.uid());
