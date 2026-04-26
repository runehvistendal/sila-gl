BEGIN;

-- ============================================================
-- Sila.gl — Initial Schema
-- Grønlands første marketplace for hytteudlejning,
-- samsejlads og oplevelser.
--
-- Alle pengebeløb gemmes i øre (INTEGER) — aldrig decimal.
-- Soft delete via deleted_at på alle tabeller.
-- ============================================================


-- === ENUMS ===

CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'completed'
);

CREATE TYPE transport_request_status AS ENUM (
  'open',
  'matched',
  'closed',
  'cancelled'
);

CREATE TYPE transport_offer_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'withdrawn'
);

CREATE TYPE ride_share_status AS ENUM (
  'active',
  'full',
  'completed',
  'cancelled'
);

CREATE TYPE review_type AS ENUM (
  'guest_to_host',
  'host_to_guest',
  'passenger_to_skipper',
  'skipper_to_passenger'
);


-- === TABLES ===

-- profiles
CREATE TABLE profiles (
  id                          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name                   TEXT        NOT NULL,
  avatar_url                  TEXT,
  phone                       TEXT,
  bio                         TEXT,
  languages                   TEXT[]      NOT NULL DEFAULT ARRAY['da'],
  stripe_account_id           TEXT,
  stripe_onboarding_complete  BOOLEAN     NOT NULL DEFAULT false,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                  TIMESTAMPTZ
);

COMMENT ON TABLE profiles IS
  'Offentlig brugerprofil knyttet til auth.users. Oprettes automatisk via trigger ved signup.';
COMMENT ON COLUMN profiles.stripe_account_id IS
  'Stripe Connect konto-ID — sættes når udbyderen gennemfører onboarding.';
COMMENT ON COLUMN profiles.stripe_onboarding_complete IS
  'True når Stripe Connect onboarding er fuldført og udbetalinger er mulige.';


-- cabins
CREATE TABLE cabins (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title                           TEXT        NOT NULL,
  description                     TEXT        NOT NULL,
  location_hub                    TEXT        NOT NULL,
  latitude                        NUMERIC(10,7) NOT NULL,
  longitude                       NUMERIC(10,7) NOT NULL,
  max_guests                      INTEGER     NOT NULL CHECK (max_guests > 0),
  bedrooms                        INTEGER     NOT NULL DEFAULT 1,
  -- Alle priser i øre (DKK × 100) — server-side beregnet, aldrig fra frontend
  price_per_night_ore             INTEGER     NOT NULL CHECK (price_per_night_ore > 0),
  cleaning_fee_ore                INTEGER     NOT NULL DEFAULT 0,
  amenities                       TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  images                          TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  instant_book                    BOOLEAN     NOT NULL DEFAULT false,
  offers_transport                BOOLEAN     NOT NULL DEFAULT false,
  transport_price_per_person_ore  INTEGER,
  access_type                     TEXT        NOT NULL CHECK (access_type IN ('road', 'boat', 'helicopter', 'other')),
  published                       BOOLEAN     NOT NULL DEFAULT false,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

COMMENT ON TABLE cabins IS
  'Hytteopslag oprettet af udbyderen. Vises i søgeresultater kun når published=true.';
COMMENT ON COLUMN cabins.location_hub IS
  'En af de 6 primære destinationer fra GREENLAND_LOCATIONS (is_major_hub=true).';
COMMENT ON COLUMN cabins.price_per_night_ore IS
  'Pris pr. nat i øre (DKK × 100). Beregnes og valideres altid server-side.';
COMMENT ON COLUMN cabins.instant_book IS
  'Vises som "Øjeblikkelig booking"-badge i UI. Ingen godkendelse fra udbyder kræves.';
COMMENT ON COLUMN cabins.offers_transport IS
  'Udbyder tilbyder transport til hytten. Se transport_price_per_person_ore.';
COMMENT ON COLUMN cabins.images IS
  'Cloudinary URL-liste. Max anbefalet 12 billeder.';


-- cabin_availability
CREATE TABLE cabin_availability (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cabin_id          UUID        NOT NULL REFERENCES cabins(id) ON DELETE CASCADE,
  date              DATE        NOT NULL,
  is_available      BOOLEAN     NOT NULL DEFAULT true,
  price_override_ore INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  UNIQUE(cabin_id, date)
);

COMMENT ON TABLE cabin_availability IS
  'Dagsbaseret tilgængelighed for en hytte. Oprettes automatisk for bookede perioder.';
COMMENT ON COLUMN cabin_availability.price_override_ore IS
  'Overskriver cabin.price_per_night_ore for denne specifikke dato (dynamisk prissætning).';


-- cabin_bookings
CREATE TABLE cabin_bookings (
  id                       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  cabin_id                 UUID           NOT NULL REFERENCES cabins(id) ON DELETE RESTRICT,
  guest_id                 UUID           NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  check_in                 DATE           NOT NULL,
  check_out                DATE           NOT NULL CHECK (check_out > check_in),
  num_guests               INTEGER        NOT NULL CHECK (num_guests > 0),
  -- Alle beløb beregnes server-side i API route — aldrig fra frontend
  total_price_ore          INTEGER        NOT NULL,
  platform_fee_ore         INTEGER        NOT NULL,
  status                   booking_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  includes_transport       BOOLEAN        NOT NULL DEFAULT false,
  transport_total_ore      INTEGER        NOT NULL DEFAULT 0,
  guest_message            TEXT,
  cancelled_at             TIMESTAMPTZ,
  cancellation_reason      TEXT,
  created_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);

COMMENT ON TABLE cabin_bookings IS
  'Booking af en hytte. Total pris beregnes altid server-side — aldrig fra frontend.';
COMMENT ON COLUMN cabin_bookings.total_price_ore IS
  'Samlet pris inkl. rengøring og evt. transport — i øre. Beregnet server-side.';
COMMENT ON COLUMN cabin_bookings.platform_fee_ore IS
  'Sila-kommission (15% af total). Beregnes server-side.';
COMMENT ON COLUMN cabin_bookings.stripe_payment_intent_id IS
  'Stripe PaymentIntent ID. Kun sat når betaling er initieret.';


-- transport_requests
CREATE TABLE transport_requests (
  id                       UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id                 UUID                      NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_location            TEXT                      NOT NULL,
  from_latitude            NUMERIC(10,7)             NOT NULL,
  from_longitude           NUMERIC(10,7)             NOT NULL,
  to_location              TEXT                      NOT NULL,
  to_latitude              NUMERIC(10,7)             NOT NULL,
  to_longitude             NUMERIC(10,7)             NOT NULL,
  desired_date             DATE                      NOT NULL,
  num_passengers           INTEGER                   NOT NULL CHECK (num_passengers > 0),
  max_price_ore            INTEGER,
  description              TEXT,
  status                   transport_request_status  NOT NULL DEFAULT 'open',
  linked_cabin_booking_id  UUID                      REFERENCES cabin_bookings(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ               NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ               NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);

COMMENT ON TABLE transport_requests IS
  'Gæst søger transport (båd) fra A til B på en given dato. Sejlere kan byde via transport_offers.';
COMMENT ON COLUMN transport_requests.max_price_ore IS
  'Ønsket max-budget i øre. NULL = intet loft.';
COMMENT ON COLUMN transport_requests.linked_cabin_booking_id IS
  'Valgfri kobling til en cabin_booking — vises samlet i gæstens overblik.';


-- transport_offers
CREATE TABLE transport_offers (
  id                       UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id               UUID                     NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
  skipper_id               UUID                     NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  price_ore                INTEGER                  NOT NULL,
  message                  TEXT,
  proposed_departure_time  TIMESTAMPTZ,
  status                   transport_offer_status   NOT NULL DEFAULT 'pending',
  created_at               TIMESTAMPTZ              NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ              NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ,
  -- En sejler kan kun afgive ét bud pr. transportanmodning
  UNIQUE(request_id, skipper_id)
);

COMMENT ON TABLE transport_offers IS
  'Sejlers bud på en transport_request. Én sejler, ét bud pr. anmodning (UNIQUE constraint).';
COMMENT ON COLUMN transport_offers.skipper_id IS
  'Reference til profilen der afgiver buddet. I UI vises altid som "sejler".';


-- ride_shares
CREATE TABLE ride_shares (
  id                          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Bemærk: kolonne hedder skipper_id i DB af legacy-årsager — i UI vises altid som "sejler"
  skipper_id                  UUID             NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_location               TEXT             NOT NULL,
  from_latitude               NUMERIC(10,7)    NOT NULL,
  from_longitude              NUMERIC(10,7)    NOT NULL,
  to_location                 TEXT             NOT NULL,
  to_latitude                 NUMERIC(10,7)    NOT NULL,
  to_longitude                NUMERIC(10,7)    NOT NULL,
  departure_at                TIMESTAMPTZ      NOT NULL,
  estimated_duration_minutes  INTEGER,
  total_seats                 INTEGER          NOT NULL CHECK (total_seats > 0),
  -- Vedligeholdes af trigger trg_ride_share_seats
  seats_available             INTEGER          NOT NULL
                                               CHECK (seats_available >= 0)
                                               CHECK (seats_available <= total_seats),
  price_per_seat_ore          INTEGER          NOT NULL CHECK (price_per_seat_ore > 0),
  boat_description            TEXT,
  description                 TEXT,
  status                      ride_share_status NOT NULL DEFAULT 'active',
  created_at                  TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ      NOT NULL DEFAULT now(),
  deleted_at                  TIMESTAMPTZ
);

COMMENT ON TABLE ride_shares IS
  'Sejler tilbyder ledige pladser på en planlagt sejltur (BlaBlaCar-model).';
COMMENT ON COLUMN ride_shares.skipper_id IS
  'Database-feltet hedder skipper_id af legacy-årsager — i UI vises altid som "sejler".';
COMMENT ON COLUMN ride_shares.seats_available IS
  'Automatisk vedligeholdt af trigger trg_ride_share_seats. Må ikke skrives direkte fra frontend.';
COMMENT ON COLUMN ride_shares.price_per_seat_ore IS
  'Pris pr. plads i øre (DKK × 100).';


-- ride_share_bookings
CREATE TABLE ride_share_bookings (
  id                       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_share_id            UUID           NOT NULL REFERENCES ride_shares(id) ON DELETE RESTRICT,
  passenger_id             UUID           NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  num_seats                INTEGER        NOT NULL CHECK (num_seats > 0),
  total_price_ore          INTEGER        NOT NULL,
  platform_fee_ore         INTEGER        NOT NULL,
  status                   booking_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  cancelled_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);

COMMENT ON TABLE ride_share_bookings IS
  'Passagerens booking af pladser på en ride_share. Status-ændringer opdaterer ride_shares.seats_available.';
COMMENT ON COLUMN ride_share_bookings.total_price_ore IS
  'num_seats × price_per_seat_ore — beregnes server-side.';
COMMENT ON COLUMN ride_share_bookings.platform_fee_ore IS
  'Sila-kommission (15% af total). Beregnes server-side.';


-- reviews
CREATE TABLE reviews (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cabin_booking_id      UUID        REFERENCES cabin_bookings(id) ON DELETE CASCADE,
  ride_share_booking_id UUID        REFERENCES ride_share_bookings(id) ON DELETE CASCADE,
  review_type           review_type NOT NULL,
  rating                INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,
  -- Præcis én booking-kontekst kræves
  CHECK (
    (cabin_booking_id IS NOT NULL AND ride_share_booking_id IS NULL) OR
    (cabin_booking_id IS NULL AND ride_share_booking_id IS NOT NULL)
  )
);

COMMENT ON TABLE reviews IS
  'Anmeldelser kræver en afsluttet booking — håndhæves i DB via RLS WITH CHECK (ikke kun frontend).';
COMMENT ON COLUMN reviews.review_type IS
  'Angiver retningen: hvem anmelder hvem (gæst→udbyder, passager→sejler osv.).';


-- messages
CREATE TABLE messages (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id             UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cabin_booking_id      UUID        REFERENCES cabin_bookings(id) ON DELETE CASCADE,
  ride_share_booking_id UUID        REFERENCES ride_share_bookings(id) ON DELETE CASCADE,
  transport_request_id  UUID        REFERENCES transport_requests(id) ON DELETE CASCADE,
  content               TEXT        NOT NULL,
  read_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

COMMENT ON TABLE messages IS
  'Direkte beskeder mellem to brugere, kontekstuelt knyttet til en booking eller transportanmodning.';
COMMENT ON COLUMN messages.read_at IS
  'NULL = ulæst. Sættes af modtageren. Bruges til "ulæste beskeder"-badge.';


-- === INDEXES ===

-- cabins
CREATE INDEX idx_cabins_location_hub_published
  ON cabins (location_hub)
  WHERE deleted_at IS NULL AND published = true;

CREATE INDEX idx_cabins_owner_id
  ON cabins (owner_id);

-- cabin_availability
CREATE INDEX idx_cabin_availability_cabin_date
  ON cabin_availability (cabin_id, date);

-- cabin_bookings
CREATE INDEX idx_cabin_bookings_cabin_dates
  ON cabin_bookings (cabin_id, check_in, check_out);

CREATE INDEX idx_cabin_bookings_guest_id
  ON cabin_bookings (guest_id);

-- transport_requests
CREATE INDEX idx_transport_requests_status_date
  ON transport_requests (status, desired_date)
  WHERE deleted_at IS NULL;

-- transport_offers
CREATE INDEX idx_transport_offers_request_id
  ON transport_offers (request_id);

-- ride_shares
CREATE INDEX idx_ride_shares_departure_status
  ON ride_shares (departure_at, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_ride_shares_skipper_id
  ON ride_shares (skipper_id);

-- ride_share_bookings
CREATE INDEX idx_ride_share_bookings_ride_share_id
  ON ride_share_bookings (ride_share_id);

CREATE INDEX idx_ride_share_bookings_passenger_id
  ON ride_share_bookings (passenger_id);

-- reviews
CREATE INDEX idx_reviews_reviewee_id
  ON reviews (reviewee_id)
  WHERE deleted_at IS NULL;

-- messages
CREATE INDEX idx_messages_recipient_read_at
  ON messages (recipient_id, read_at);

CREATE INDEX idx_messages_sender_id
  ON messages (sender_id);


-- === TRIGGERS ===

-- ---------------------------------------------------------
-- Generisk updated_at-funktion — bruges af alle tabeller
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cabins_updated_at
  BEFORE UPDATE ON cabins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cabin_availability_updated_at
  BEFORE UPDATE ON cabin_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cabin_bookings_updated_at
  BEFORE UPDATE ON cabin_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transport_requests_updated_at
  BEFORE UPDATE ON transport_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transport_offers_updated_at
  BEFORE UPDATE ON transport_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ride_shares_updated_at
  BEFORE UPDATE ON ride_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ride_share_bookings_updated_at
  BEFORE UPDATE ON ride_share_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ---------------------------------------------------------
-- handle_new_user
-- Opretter automatisk en profiles-row når en ny auth.users
-- row indsættes (Google OAuth, Facebook OAuth, email/password).
-- SECURITY DEFINER kører som postgres-rollen → omgår RLS.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      NEW.email
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ---------------------------------------------------------
-- update_ride_share_seats
-- Vedligeholder ride_shares.seats_available og status
-- automatisk når ride_share_bookings.status ændres.
--
-- Regler:
--   INSERT med status='confirmed'        → træk num_seats fra
--   UPDATE: pending→confirmed            → træk num_seats fra
--   UPDATE: confirmed→cancelled          → læg num_seats til
--   seats_available = 0                  → sæt status='full'
--   seats_available > 0 + status='full'  → sæt status='active'
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION update_ride_share_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN

    -- Guard: tjek at der er nok pladser
    IF (SELECT seats_available FROM ride_shares WHERE id = NEW.ride_share_id) < NEW.num_seats THEN
      RAISE EXCEPTION 'Ikke nok ledige pladser på samsejlads %', NEW.ride_share_id;
    END IF;

    UPDATE ride_shares
    SET
      seats_available = seats_available - NEW.num_seats,
      status = CASE
        WHEN (seats_available - NEW.num_seats) = 0 THEN 'full'::ride_share_status
        ELSE status
      END
    WHERE id = NEW.ride_share_id;

  ELSIF TG_OP = 'UPDATE' THEN

    -- Bekræftelse af booking: træk pladser fra
    IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN

      IF (SELECT seats_available FROM ride_shares WHERE id = NEW.ride_share_id) < NEW.num_seats THEN
        RAISE EXCEPTION 'Ikke nok ledige pladser på samsejlads %', NEW.ride_share_id;
      END IF;

      UPDATE ride_shares
      SET
        seats_available = seats_available - NEW.num_seats,
        status = CASE
          WHEN (seats_available - NEW.num_seats) = 0 THEN 'full'::ride_share_status
          ELSE status
        END
      WHERE id = NEW.ride_share_id;

    -- Annullering af bekræftet booking: giv pladser tilbage
    ELSIF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN

      UPDATE ride_shares
      SET
        seats_available = seats_available + OLD.num_seats,
        status = CASE
          WHEN status = 'full' AND (seats_available + OLD.num_seats) > 0
            THEN 'active'::ride_share_status
          ELSE status
        END
      WHERE id = OLD.ride_share_id;

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger kun ved INSERT og ved ændring af status-kolonnen
CREATE TRIGGER trg_ride_share_seats
  AFTER INSERT OR UPDATE OF status ON ride_share_bookings
  FOR EACH ROW EXECUTE FUNCTION update_ride_share_seats();


-- === RLS — AKTIVER PÅ ALLE TABELLER ===

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabins                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabin_availability    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabin_bookings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_offers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_shares           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_share_bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages              ENABLE ROW LEVEL SECURITY;


-- === RLS POLICIES ===

-- ---------------------------------------------------------
-- profiles
-- INSERT er blokeret med vilje — kun handle_new_user trigger
-- (SECURITY DEFINER) må oprette profil-rows.
-- ---------------------------------------------------------
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "profiles_update_owner"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ---------------------------------------------------------
-- cabins
-- ---------------------------------------------------------
-- Alle (inkl. anonym) kan se publicerede hytter
CREATE POLICY "cabins_select_published"
  ON cabins FOR SELECT
  USING (published = true AND deleted_at IS NULL);

-- Udbyder kan altid se egne hytter uanset published-status
CREATE POLICY "cabins_select_owner"
  ON cabins FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "cabins_insert"
  ON cabins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "cabins_update_owner"
  ON cabins FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Soft delete foretrækkes (UPDATE deleted_at), men DELETE-policy tillades
CREATE POLICY "cabins_delete_owner"
  ON cabins FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);


-- ---------------------------------------------------------
-- cabin_availability
-- ---------------------------------------------------------
-- Alle kan se availability for publicerede hytter;
-- udbyder kan derudover se egne uanset published-status.
CREATE POLICY "cabin_availability_select"
  ON cabin_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cabins c
      WHERE c.id = cabin_id
        AND c.published = true
        AND c.deleted_at IS NULL
    )
    OR (
      auth.uid() IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM cabins c
        WHERE c.id = cabin_id
          AND c.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "cabin_availability_insert_owner"
  ON cabin_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cabins c
      WHERE c.id = cabin_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "cabin_availability_update_owner"
  ON cabin_availability FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cabins c
      WHERE c.id = cabin_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cabins c
      WHERE c.id = cabin_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "cabin_availability_delete_owner"
  ON cabin_availability FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cabins c
      WHERE c.id = cabin_id AND c.owner_id = auth.uid()
    )
  );


-- ---------------------------------------------------------
-- cabin_bookings
-- ---------------------------------------------------------
CREATE POLICY "cabin_bookings_select"
  ON cabin_bookings FOR SELECT
  TO authenticated
  USING (
    guest_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM cabins c
      WHERE c.id = cabin_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "cabin_bookings_insert"
  ON cabin_bookings FOR INSERT
  TO authenticated
  WITH CHECK (guest_id = auth.uid());

CREATE POLICY "cabin_bookings_update"
  ON cabin_bookings FOR UPDATE
  TO authenticated
  USING (
    guest_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM cabins c
      WHERE c.id = cabin_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    guest_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM cabins c
      WHERE c.id = cabin_id AND c.owner_id = auth.uid()
    )
  );


-- ---------------------------------------------------------
-- transport_requests
-- Alle authenticated brugere kan se åbne/matchede anmodninger.
-- Separat policy sikrer at ejeren altid kan se sine egne.
-- ---------------------------------------------------------
CREATE POLICY "transport_requests_select_open"
  ON transport_requests FOR SELECT
  TO authenticated
  USING (
    status IN ('open', 'matched') AND deleted_at IS NULL
  );

CREATE POLICY "transport_requests_select_owner"
  ON transport_requests FOR SELECT
  TO authenticated
  USING (guest_id = auth.uid());

CREATE POLICY "transport_requests_insert"
  ON transport_requests FOR INSERT
  TO authenticated
  WITH CHECK (guest_id = auth.uid());

CREATE POLICY "transport_requests_update_owner"
  ON transport_requests FOR UPDATE
  TO authenticated
  USING (guest_id = auth.uid())
  WITH CHECK (guest_id = auth.uid());

CREATE POLICY "transport_requests_delete_owner"
  ON transport_requests FOR DELETE
  TO authenticated
  USING (guest_id = auth.uid());


-- ---------------------------------------------------------
-- transport_offers
-- ---------------------------------------------------------
CREATE POLICY "transport_offers_select"
  ON transport_offers FOR SELECT
  TO authenticated
  USING (
    skipper_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM transport_requests tr
      WHERE tr.id = request_id AND tr.guest_id = auth.uid()
    )
  );

CREATE POLICY "transport_offers_insert"
  ON transport_offers FOR INSERT
  TO authenticated
  WITH CHECK (skipper_id = auth.uid());

-- Sejler kan ændre eget bud; request-ejer kan acceptere/afvise
CREATE POLICY "transport_offers_update"
  ON transport_offers FOR UPDATE
  TO authenticated
  USING (
    skipper_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM transport_requests tr
      WHERE tr.id = request_id AND tr.guest_id = auth.uid()
    )
  )
  WITH CHECK (
    skipper_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM transport_requests tr
      WHERE tr.id = request_id AND tr.guest_id = auth.uid()
    )
  );


-- ---------------------------------------------------------
-- ride_shares
-- ---------------------------------------------------------
-- Alle (inkl. anonym) kan se aktive/fulde samsejladser
CREATE POLICY "ride_shares_select_public"
  ON ride_shares FOR SELECT
  USING (
    status IN ('active', 'full') AND deleted_at IS NULL
  );

-- Sejler kan altid se egne uanset status
CREATE POLICY "ride_shares_select_skipper"
  ON ride_shares FOR SELECT
  TO authenticated
  USING (auth.uid() = skipper_id);

CREATE POLICY "ride_shares_insert"
  ON ride_shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = skipper_id);

CREATE POLICY "ride_shares_update_skipper"
  ON ride_shares FOR UPDATE
  TO authenticated
  USING (auth.uid() = skipper_id)
  WITH CHECK (auth.uid() = skipper_id);


-- ---------------------------------------------------------
-- ride_share_bookings
-- ---------------------------------------------------------
CREATE POLICY "ride_share_bookings_select"
  ON ride_share_bookings FOR SELECT
  TO authenticated
  USING (
    passenger_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM ride_shares rs
      WHERE rs.id = ride_share_id AND rs.skipper_id = auth.uid()
    )
  );

CREATE POLICY "ride_share_bookings_insert"
  ON ride_share_bookings FOR INSERT
  TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "ride_share_bookings_update"
  ON ride_share_bookings FOR UPDATE
  TO authenticated
  USING (
    passenger_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM ride_shares rs
      WHERE rs.id = ride_share_id AND rs.skipper_id = auth.uid()
    )
  )
  WITH CHECK (
    passenger_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM ride_shares rs
      WHERE rs.id = ride_share_id AND rs.skipper_id = auth.uid()
    )
  );


-- ---------------------------------------------------------
-- reviews — KRITISK SIKKERHEDSPOLICY
-- INSERT kræver en afsluttet booking i databasen.
-- Håndhæves via EXISTS-subquery i WITH CHECK — ikke kun frontend.
-- ---------------------------------------------------------
CREATE POLICY "reviews_select_authenticated"
  ON reviews FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "reviews_insert"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND (
      -- Hytte-booking: reviewer er gæst eller udbyder og booking er completed
      (
        cabin_booking_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM cabin_bookings cb
          WHERE cb.id = cabin_booking_id
            AND cb.status = 'completed'
            AND (
              cb.guest_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM cabins c
                WHERE c.id = cb.cabin_id AND c.owner_id = auth.uid()
              )
            )
        )
      )
      OR
      -- Samsejlads-booking: reviewer er passager eller sejler og booking er completed
      (
        ride_share_booking_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM ride_share_bookings rsb
          WHERE rsb.id = ride_share_booking_id
            AND rsb.status = 'completed'
            AND (
              rsb.passenger_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM ride_shares rs
                WHERE rs.id = rsb.ride_share_id AND rs.skipper_id = auth.uid()
              )
            )
        )
      )
    )
  );

-- Reviewer kan redigere sin anmeldelse inden for 14 dage
CREATE POLICY "reviews_update_reviewer_14d"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = auth.uid()
    AND created_at > (now() - INTERVAL '14 days')
  )
  WITH CHECK (
    reviewer_id = auth.uid()
    AND created_at > (now() - INTERVAL '14 days')
  );


-- ---------------------------------------------------------
-- messages
-- ---------------------------------------------------------
CREATE POLICY "messages_select"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

CREATE POLICY "messages_insert"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Kun modtageren må sætte read_at
CREATE POLICY "messages_update_recipient"
  ON messages FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());


COMMIT;
