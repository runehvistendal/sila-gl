-- Ny tabel: både (sejlerens båd som aktiv)
CREATE TABLE boats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  boat_type text,
  capacity integer NOT NULL DEFAULT 4,
  has_cabin boolean DEFAULT false,
  equipment text[] DEFAULT '{}',
  safety_confirmed boolean DEFAULT false,
  addon_services jsonb DEFAULT '[]',
  images text[] DEFAULT '{}',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Tilføj manglende kolonner til cabins
ALTER TABLE cabins
  ADD COLUMN IF NOT EXISTS facilities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS addon_services jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS transport_from text,
  ADD COLUMN IF NOT EXISTS transport_price_roundtrip_ore integer,
  ADD COLUMN IF NOT EXISTS available_from date,
  ADD COLUMN IF NOT EXISTS available_to date;

-- Tilføj manglende kolonner til ride_shares
ALTER TABLE ride_shares
  ADD COLUMN IF NOT EXISTS boat_id uuid REFERENCES boats(id),
  ADD COLUMN IF NOT EXISTS return_date date,
  ADD COLUMN IF NOT EXISTS return_time time,
  ADD COLUMN IF NOT EXISTS return_seats integer,
  ADD COLUMN IF NOT EXISTS price_per_seat_roundtrip_ore integer;

-- RLS på boats
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
CREATE POLICY boats_owner_all ON boats
  USING (owner_id = auth.uid());
CREATE POLICY boats_public_read ON boats
  FOR SELECT USING (deleted_at IS NULL);
