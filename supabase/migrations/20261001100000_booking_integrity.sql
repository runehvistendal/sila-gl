-- =====================================================================
-- SILA.GL — BOOKING INTEGRITY (1.10.2026)
--
-- Retter tre klasser af fejl fundet ved gennemgang:
--
--  1. SIKKERHED: Authenticated brugere kunne via PostgREST (offentlig anon-
--     nøgle + session) INSERT'e bookinger med status='confirmed' og
--     contact_info_visible_until sat — uden betaling. Det låste kalendere og
--     afslørede modpartens kontaktinfo via get_contact_info_for_booking.
--     Værter kunne også sætte en ubetalt pending-booking til 'confirmed'.
--     experience_bookings_update tillod desuden anonyme (auth.uid() IS NULL)
--     opdateringer af ALLE oplevelsesbookinger.
--     → booking_status_guard(): kun service_role / cron må bekræfte.
--       Brugere må kun oprette 'pending' og kun gå pending → cancelled.
--
--  2. SAMSEJLADS-PLADSER: Trigger trak pladser ved confirm, og webhooken
--     trak dem én gang til (dobbelt fradrag). Pladser blev heller ikke holdt
--     under checkout → to gæster kunne betale for sidste plads.
--     → Pladser holdes atomisk ved INSERT (pending), frigives ved cancel.
--       seats_held-flag gør det sikkert for eksisterende rækker.
--
--  3. UDLØB: pending udløb efter 15 min mens Stripe Checkout-sessioner
--     levede 24 timer → betaling kunne gå igennem på allerede frigivne datoer.
--     → App sætter nu expires_at = +30 min på alle sessions (Stripe-minimum);
--       cron udløber pending efter 35 min for hytte-, samsejlads- og
--       oplevelsesbookinger (de to sidste udløb aldrig før).
--
--  Desuden: 12-passager-loft (over 12 = passagerskib, jf. Søfartsstyrelsen),
--  nye samsejlads-felter (mødested, bagage, fleksibilitet, aflysning),
--  bådens erhvervsstatus, tidsvindue på transportanmodninger og
--  turistlicens-felter på oplevelser (Inatsisartutlov nr. 62/2024).
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- 1. Generisk status-guard for bookingtabeller
-- ─────────────────────────────────────────────────────────────────────
-- Begrænsninger gælder kun for PostgREST-rollerne anon/authenticated.
-- service_role (webhook, server actions med service client) og postgres
-- (pg_cron, SECURITY DEFINER-funktioner) passerer uændret.

CREATE OR REPLACE FUNCTION public.booking_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  new_j jsonb := to_jsonb(NEW);
  old_j jsonb;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status::text IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'Bookinger kan kun oprettes som pending (%).', TG_TABLE_NAME
        USING ERRCODE = '42501';
    END IF;
    IF new_j ->> 'stripe_payment_intent_id' IS NOT NULL
       OR new_j ->> 'contact_info_visible_until' IS NOT NULL THEN
      RAISE EXCEPTION 'Betalings- og kontaktfelter sættes kun af systemet (%).', TG_TABLE_NAME
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  old_j := to_jsonb(OLD);

  IF NEW.status::text IS DISTINCT FROM OLD.status::text THEN
    IF NOT (OLD.status::text = 'pending' AND NEW.status::text = 'cancelled') THEN
      RAISE EXCEPTION 'Statusændring % → % er ikke tilladt for brugere (%).',
        OLD.status, NEW.status, TG_TABLE_NAME
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF (new_j -> 'contact_info_visible_until') IS DISTINCT FROM (old_j -> 'contact_info_visible_until') THEN
    RAISE EXCEPTION 'contact_info_visible_until kan ikke ændres (%).', TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cabin_bookings_status_guard ON public.cabin_bookings;
CREATE TRIGGER trg_cabin_bookings_status_guard
  BEFORE INSERT OR UPDATE ON public.cabin_bookings
  FOR EACH ROW EXECUTE FUNCTION public.booking_status_guard();

DROP TRIGGER IF EXISTS trg_ride_share_bookings_status_guard ON public.ride_share_bookings;
CREATE TRIGGER trg_ride_share_bookings_status_guard
  BEFORE INSERT OR UPDATE ON public.ride_share_bookings
  FOR EACH ROW EXECUTE FUNCTION public.booking_status_guard();

DROP TRIGGER IF EXISTS trg_experience_bookings_status_guard ON public.experience_bookings;
CREATE TRIGGER trg_experience_bookings_status_guard
  BEFORE INSERT OR UPDATE ON public.experience_bookings
  FOR EACH ROW EXECUTE FUNCTION public.booking_status_guard();


-- ride_share_bookings havde ingen guard for betalingsfelter (cabin_bookings og
-- experience_bookings har). Samme mønster.
CREATE OR REPLACE FUNCTION public.ride_share_bookings_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF OLD.total_price_ore          IS DISTINCT FROM NEW.total_price_ore          OR
     OLD.platform_fee_ore         IS DISTINCT FROM NEW.platform_fee_ore         OR
     OLD.service_fee_ore          IS DISTINCT FROM NEW.service_fee_ore          OR
     OLD.stripe_session_id        IS DISTINCT FROM NEW.stripe_session_id        OR
     OLD.stripe_payment_intent_id IS DISTINCT FROM NEW.stripe_payment_intent_id OR
     OLD.passenger_id             IS DISTINCT FROM NEW.passenger_id             OR
     OLD.ride_share_id            IS DISTINCT FROM NEW.ride_share_id            OR
     OLD.num_seats                IS DISTINCT FROM NEW.num_seats
  THEN
    RAISE EXCEPTION 'ride_share_bookings: betalingsfelter kan ikke ændres'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ride_share_bookings_guard_update ON public.ride_share_bookings;
CREATE TRIGGER trg_ride_share_bookings_guard_update
  BEFORE UPDATE ON public.ride_share_bookings
  FOR EACH ROW EXECUTE FUNCTION public.ride_share_bookings_guard_update();


-- experience_bookings_update: fjern "OR auth.uid() IS NULL" (åbnede for anon)
-- service_role omgår RLS alligevel.
DROP POLICY IF EXISTS "experience_bookings_update" ON public.experience_bookings;
CREATE POLICY "experience_bookings_update"
  ON public.experience_bookings FOR UPDATE
  TO authenticated
  USING (
    guest_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.experiences e
      WHERE e.id = experience_id AND e.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    guest_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.experiences e
      WHERE e.id = experience_id AND e.provider_id = auth.uid()
    )
  );

-- Den gamle experience-guard brugte auth.uid() IS NULL som bypass.
CREATE OR REPLACE FUNCTION public.experience_bookings_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN RETURN NEW; END IF;

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


-- ─────────────────────────────────────────────────────────────────────
-- 2. Samsejlads: pladser holdes ved pending, frigives ved cancel
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.ride_share_bookings
  ADD COLUMN IF NOT EXISTS seats_held          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS refunded_amount_ore integer NOT NULL DEFAULT 0
    CHECK (refunded_amount_ore >= 0);

COMMENT ON COLUMN public.ride_share_bookings.seats_held IS
  'true når bookingen holder pladser i ride_shares.seats_available. Sættes/nulstilles kun af trigger.';
COMMENT ON COLUMN public.ride_share_bookings.cancellation_reason IS
  'expired | passenger_cancelled | skipper_cancelled | weather | overbooked_refunded | stripe_failed';

-- Ny trigger erstatter update_ride_share_seats (som trak pladser ved confirm,
-- hvilket webhooken så gentog → dobbelt fradrag).
DROP TRIGGER IF EXISTS trg_ride_share_seats ON public.ride_share_bookings;

CREATE OR REPLACE FUNCTION public.ride_share_seat_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wants_hold boolean;
BEGIN
  wants_hold := NEW.status::text IN ('pending', 'confirmed');

  -- Hold pladser (ny booking, eller legacy-række der bekræftes uden hold)
  IF wants_hold AND NOT COALESCE(
       CASE WHEN TG_OP = 'UPDATE' THEN OLD.seats_held ELSE false END, false) THEN
    UPDATE public.ride_shares
    SET seats_available = seats_available - NEW.num_seats,
        status = CASE
          WHEN seats_available - NEW.num_seats = 0 THEN 'full'::ride_share_status
          ELSE status
        END,
        updated_at = now()
    WHERE id = NEW.ride_share_id
      AND deleted_at IS NULL
      AND status IN ('active', 'full')
      AND seats_available >= NEW.num_seats;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ikke nok ledige pladser på samsejlads %', NEW.ride_share_id
        USING ERRCODE = 'P0001';
    END IF;

    NEW.seats_held := true;
    RETURN NEW;
  END IF;

  -- Frigiv pladser ved annullering
  IF TG_OP = 'UPDATE' AND OLD.seats_held AND NEW.status::text = 'cancelled' THEN
    UPDATE public.ride_shares
    SET seats_available = LEAST(total_seats, seats_available + OLD.num_seats),
        status = CASE
          WHEN status = 'full' THEN 'active'::ride_share_status
          ELSE status
        END,
        updated_at = now()
    WHERE id = OLD.ride_share_id;

    NEW.seats_held := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ride_share_seat_hold ON public.ride_share_bookings;
CREATE TRIGGER trg_ride_share_seat_hold
  BEFORE INSERT OR UPDATE OF status ON public.ride_share_bookings
  FOR EACH ROW EXECUTE FUNCTION public.ride_share_seat_hold();

-- Bookinger oprettes udelukkende af /api/transport/checkout med service client.
-- En direkte INSERT fra klienten ville kunne holde alle pladser uden betaling.
DROP POLICY IF EXISTS "ride_share_bookings_insert" ON public.ride_share_bookings;

-- Brugere må aldrig sætte seats_held selv
CREATE OR REPLACE FUNCTION public.ride_share_bookings_protect_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.seats_held := false;
    ELSIF NEW.seats_held IS DISTINCT FROM OLD.seats_held THEN
      NEW.seats_held := OLD.seats_held;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Navngivet så den kører FØR seat_hold (triggers fyres alfabetisk)
DROP TRIGGER IF EXISTS trg_ride_share_bookings_a_protect_hold ON public.ride_share_bookings;
CREATE TRIGGER trg_ride_share_bookings_a_protect_hold
  BEFORE INSERT OR UPDATE ON public.ride_share_bookings
  FOR EACH ROW EXECUTE FUNCTION public.ride_share_bookings_protect_hold();


-- ─────────────────────────────────────────────────────────────────────
-- 3. ride_shares: nye felter, 12-pax-loft, guard mod skjulte ændringer
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.ride_shares
  ADD COLUMN IF NOT EXISTS meeting_point        text,
  ADD COLUMN IF NOT EXISTS luggage_allowance    text
    CHECK (luggage_allowance IS NULL OR luggage_allowance IN ('small', 'medium', 'large')),
  ADD COLUMN IF NOT EXISTS flexibility_minutes  integer
    CHECK (flexibility_minutes IS NULL OR flexibility_minutes BETWEEN 0 AND 720),
  ADD COLUMN IF NOT EXISTS cancelled_at         timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason  text;

COMMENT ON COLUMN public.ride_shares.luggage_allowance IS
  'small = én taske/rygsæk · medium = rygsæk + taske · large = plads til ekspeditionsudstyr';
COMMENT ON COLUMN public.ride_shares.flexibility_minutes IS
  'Hvor meget afgangen kan rykke (vejr/tidevand). 0 = fast tid.';

-- Over 12 passagerer gør fartøjet til et passagerskib (Søfartsstyrelsen).
-- NOT VALID: eksisterende testdata valideres ikke, alle nye rækker gør.
ALTER TABLE public.ride_shares
  DROP CONSTRAINT IF EXISTS ride_shares_max_12_passengers;
ALTER TABLE public.ride_shares
  ADD CONSTRAINT ride_shares_max_12_passengers CHECK (total_seats <= 12) NOT VALID;

CREATE OR REPLACE FUNCTION public.ride_shares_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  has_bookings boolean;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  -- Pladser vedligeholdes kun af ride_share_seat_hold
  IF NEW.seats_available IS DISTINCT FROM OLD.seats_available
     OR NEW.total_seats IS DISTINCT FROM OLD.total_seats THEN
    RAISE EXCEPTION 'Pladser kan ikke ændres direkte' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.ride_share_bookings b
    WHERE b.ride_share_id = OLD.id
      AND b.status IN ('pending', 'confirmed')
  ) INTO has_bookings;

  IF has_bookings THEN
    IF NEW.price_per_seat_ore IS DISTINCT FROM OLD.price_per_seat_ore
       OR NEW.departure_at     IS DISTINCT FROM OLD.departure_at
       OR NEW.from_location    IS DISTINCT FROM OLD.from_location
       OR NEW.to_location      IS DISTINCT FROM OLD.to_location THEN
      RAISE EXCEPTION 'Rute, tid og pris kan ikke ændres når der er bookinger'
        USING ERRCODE = '42501';
    END IF;
    -- Aflysning med passagerer skal gå via serveren (refusion)
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'cancelled' THEN
      RAISE EXCEPTION 'Aflys via Sila, så passagererne refunderes'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ride_shares_guard_update ON public.ride_shares;
CREATE TRIGGER trg_ride_shares_guard_update
  BEFORE UPDATE ON public.ride_shares
  FOR EACH ROW EXECUTE FUNCTION public.ride_shares_guard_update();


-- ─────────────────────────────────────────────────────────────────────
-- 4. Både: erhvervsstatus og dokumentation
-- ─────────────────────────────────────────────────────────────────────
-- Betalt passagersejlads med op til 12 passagerer i fartøjer < 15 m er
-- omfattet af BEK nr. 956 af 26/09/2012 (gælder også i Grønland).
-- Sila gemmer sejlerens egne oplysninger; myndighedsgodkendelse er
-- sejlerens ansvar. Felterne bruges til badges og til at kræve
-- bekræftelse før en betalt tur kan oprettes.

ALTER TABLE public.boats
  ADD COLUMN IF NOT EXISTS operator_type          text NOT NULL DEFAULT 'private'
    CHECK (operator_type IN ('private', 'commercial')),
  ADD COLUMN IF NOT EXISTS length_m               numeric(4,1)
    CHECK (length_m IS NULL OR (length_m > 0 AND length_m < 100)),
  ADD COLUMN IF NOT EXISTS registration_ref       text,
  ADD COLUMN IF NOT EXISTS vessel_approval_ref    text,
  ADD COLUMN IF NOT EXISTS skipper_certificate    text,
  ADD COLUMN IF NOT EXISTS has_insurance          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compliance_confirmed_at timestamptz;

COMMENT ON COLUMN public.boats.operator_type IS
  'private = privat sejler, commercial = erhvervsmæssig passagersejlads (BEK 956)';
COMMENT ON COLUMN public.boats.vessel_approval_ref IS
  'Fartstilladelse/syn-reference fra Søfartsstyrelsen (sejlerens oplysning, ikke verificeret)';
COMMENT ON COLUMN public.boats.skipper_certificate IS
  'Førerbevis, fx erhvervsduelighedsbevis (12 pax) — sejlerens oplysning';
COMMENT ON COLUMN public.boats.compliance_confirmed_at IS
  'Tidspunkt hvor sejleren bekræftede sikkerhedsinstruks, redningsveste til alle og max 12 pax';


-- ─────────────────────────────────────────────────────────────────────
-- 5. Transportanmodninger: foretrukket tidsvindue + udløb
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.transport_requests
  ADD COLUMN IF NOT EXISTS preferred_time_from time,
  ADD COLUMN IF NOT EXISTS preferred_time_to   time;

ALTER TABLE public.transport_requests
  DROP CONSTRAINT IF EXISTS transport_requests_time_window;
ALTER TABLE public.transport_requests
  ADD CONSTRAINT transport_requests_time_window CHECK (
    preferred_time_from IS NULL OR preferred_time_to IS NULL
    OR preferred_time_to > preferred_time_from
  ) NOT VALID;


-- ─────────────────────────────────────────────────────────────────────
-- 6. Oplevelser: turistlicens (Inatsisartutlov nr. 62 af 25.11.2024)
-- ─────────────────────────────────────────────────────────────────────
-- Licens kræves for turistvirksomhed (oplevelser som dagsture/flerdagsture)
-- medmindre omsætningen er under 50.000 kr./år (§ 3, stk. 6).
-- Eksisterende virksomheder: overgang til 1.1.2027 (§ 18).

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS tourism_license_status text
    CHECK (tourism_license_status IS NULL
           OR tourism_license_status IN ('licensed', 'applied', 'below_threshold')),
  ADD COLUMN IF NOT EXISTS tourism_license_ref    text;


-- ─────────────────────────────────────────────────────────────────────
-- 7. Udløb af pending bookinger — 35 min (Stripe-session: 30 min)
-- ─────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('cancel-expired-pending-bookings')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cancel-expired-pending-bookings');

SELECT cron.schedule(
  'cancel-expired-pending-bookings',
  '*/5 * * * *',
  $$
    UPDATE public.cabin_bookings
    SET status = 'cancelled', cancelled_at = NOW(),
        cancellation_reason = 'expired', updated_at = NOW()
    WHERE status = 'pending' AND created_at < NOW() - INTERVAL '35 minutes';

    UPDATE public.ride_share_bookings
    SET status = 'cancelled', cancelled_at = NOW(),
        cancellation_reason = 'expired', updated_at = NOW()
    WHERE status = 'pending' AND created_at < NOW() - INTERVAL '35 minutes';

    UPDATE public.experience_bookings
    SET status = 'cancelled', updated_at = NOW()
    WHERE status = 'pending' AND created_at < NOW() - INTERVAL '35 minutes';
  $$
);

-- Afsluttede samsejladser + udløbne transportanmodninger (dagligt, Nuuk-tid)
SELECT cron.unschedule('close-past-ride-shares-and-requests')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close-past-ride-shares-and-requests');

SELECT cron.schedule(
  'close-past-ride-shares-and-requests',
  '15 * * * *',
  $$
    UPDATE public.ride_shares
    SET status = 'completed', updated_at = NOW()
    WHERE status IN ('active', 'full')
      AND departure_at < NOW() - INTERVAL '12 hours';

    UPDATE public.transport_requests
    SET status = 'closed', updated_at = NOW()
    WHERE status = 'open'
      AND desired_date < (NOW() AT TIME ZONE 'America/Godthab')::date;
  $$
);
