CREATE EXTENSION IF NOT EXISTS moddatetime;

-- =============================================
-- experiences
-- =============================================
CREATE TABLE experiences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT,
  images                TEXT[] DEFAULT '{}',
  location_hub          TEXT NOT NULL,
  price_per_person_ore  INTEGER NOT NULL CHECK (price_per_person_ore > 0),
  max_participants      INTEGER NOT NULL CHECK (max_participants >= 1),
  duration_minutes      INTEGER CHECK (duration_minutes > 0),
  category              TEXT,
  published             BOOLEAN NOT NULL DEFAULT false,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experiences_select_published"
  ON experiences FOR SELECT
  USING (published = true AND deleted_at IS NULL);

CREATE POLICY "experiences_select_own"
  ON experiences FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "experiences_insert"
  ON experiences FOR INSERT
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "experiences_update"
  ON experiences FOR UPDATE
  USING (provider_id = auth.uid());

CREATE POLICY "experiences_delete"
  ON experiences FOR DELETE
  USING (provider_id = auth.uid());

CREATE TRIGGER experiences_updated_at
  BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);


-- =============================================
-- experience_availability
-- =============================================
CREATE TABLE experience_availability (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  is_available  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (experience_id, date)
);

ALTER TABLE experience_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experience_availability_select"
  ON experience_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experience_id
        AND e.published = true
        AND e.deleted_at IS NULL
    )
    OR
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experience_id
        AND e.provider_id = auth.uid()
    )
  );

CREATE POLICY "experience_availability_insert"
  ON experience_availability FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experience_id AND e.provider_id = auth.uid()
    )
  );

CREATE POLICY "experience_availability_update"
  ON experience_availability FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experience_id AND e.provider_id = auth.uid()
    )
  );

CREATE POLICY "experience_availability_delete"
  ON experience_availability FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experience_id AND e.provider_id = auth.uid()
    )
  );


-- =============================================
-- experience_bookings
-- =============================================
CREATE TABLE experience_bookings (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id              UUID NOT NULL REFERENCES experiences(id) ON DELETE RESTRICT,
  guest_id                   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  date                       DATE NOT NULL,
  num_participants            INTEGER NOT NULL CHECK (num_participants >= 1),
  total_price_ore            INTEGER NOT NULL CHECK (total_price_ore >= 0),
  service_fee_ore            INTEGER NOT NULL DEFAULT 0 CHECK (service_fee_ore >= 0),
  platform_fee_ore           INTEGER NOT NULL DEFAULT 0 CHECK (platform_fee_ore >= 0),
  stripe_session_id          TEXT,
  stripe_payment_intent_id   TEXT,
  status                     TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
  contact_info_visible_until TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE experience_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experience_bookings_select_guest"
  ON experience_bookings FOR SELECT
  USING (guest_id = auth.uid());

CREATE POLICY "experience_bookings_select_provider"
  ON experience_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experience_id AND e.provider_id = auth.uid()
    )
  );

CREATE POLICY "experience_bookings_insert"
  ON experience_bookings FOR INSERT
  WITH CHECK (guest_id = auth.uid());

CREATE POLICY "experience_bookings_update"
  ON experience_bookings FOR UPDATE
  USING (
    guest_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experience_id AND e.provider_id = auth.uid()
    )
    OR auth.uid() IS NULL
  );

CREATE TRIGGER experience_bookings_updated_at
  BEFORE UPDATE ON experience_bookings
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE OR REPLACE FUNCTION experience_bookings_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF OLD.total_price_ore           IS DISTINCT FROM NEW.total_price_ore           OR
     OLD.service_fee_ore           IS DISTINCT FROM NEW.service_fee_ore           OR
     OLD.platform_fee_ore          IS DISTINCT FROM NEW.platform_fee_ore          OR
     OLD.stripe_session_id         IS DISTINCT FROM NEW.stripe_session_id         OR
     OLD.stripe_payment_intent_id  IS DISTINCT FROM NEW.stripe_payment_intent_id  OR
     OLD.guest_id                  IS DISTINCT FROM NEW.guest_id                  OR
     OLD.experience_id             IS DISTINCT FROM NEW.experience_id             OR
     OLD.date                      IS DISTINCT FROM NEW.date
  THEN
    RAISE EXCEPTION 'experience_bookings: immutable fields cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER experience_bookings_guard
  BEFORE UPDATE ON experience_bookings
  FOR EACH ROW EXECUTE FUNCTION experience_bookings_guard_update();


-- =============================================
-- experience_listings
-- =============================================
CREATE TABLE experience_listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  listing_id    UUID NOT NULL,
  listing_type  TEXT NOT NULL CHECK (listing_type IN ('cabin', 'ride_share')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (experience_id, listing_id, listing_type)
);

ALTER TABLE experience_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experience_listings_select"
  ON experience_listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experience_id
        AND e.published = true
        AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experience_id AND e.provider_id = auth.uid()
    )
  );

CREATE POLICY "experience_listings_insert"
  ON experience_listings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experience_id AND e.provider_id = auth.uid()
    )
  );

CREATE POLICY "experience_listings_delete"
  ON experience_listings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM experiences e
      WHERE e.id = experience_id AND e.provider_id = auth.uid()
    )
  );


-- =============================================
-- Indekser
-- =============================================
CREATE INDEX idx_experiences_provider      ON experiences(provider_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_experiences_location      ON experiences(location_hub) WHERE published = true AND deleted_at IS NULL;
CREATE INDEX idx_exp_availability_exp_date ON experience_availability(experience_id, date);
CREATE INDEX idx_exp_bookings_experience   ON experience_bookings(experience_id);
CREATE INDEX idx_exp_bookings_guest        ON experience_bookings(guest_id);
CREATE INDEX idx_exp_bookings_date_status  ON experience_bookings(date, status);
CREATE INDEX idx_exp_listings_listing      ON experience_listings(listing_id, listing_type);
