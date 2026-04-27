-- =============================================================
-- SILA.GL — SECURITY AUDIT MIGRATION (2026-04-27)
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. KRITISK: profiles kolonneniveau-sikkerhed
--    Problemet: profiles_select_authenticated tillader enhver
--    authenticated bruger at læse stripe_account_id, phone,
--    stripe_onboarding_complete på ALLE profiler.
-- ──────────────────────────────────────────────────────────────

-- Fjern brede kolonneadgang for authenticated og anon
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

-- Giv kun sikre publike kolonner til authenticated
GRANT SELECT (
  id,
  full_name,
  avatar_url,
  bio,
  role_type,
  location,
  location_id,
  language,
  languages,
  created_at,
  updated_at,
  deleted_at
) ON public.profiles TO authenticated;

-- Anon må ingenting (ingen politikker giver anon adgang til profiles)
GRANT SELECT (
  id,
  full_name,
  avatar_url,
  bio,
  role_type,
  location
) ON public.profiles TO anon;

-- service_role bevarer fuld adgang (bruges server-side)
GRANT ALL ON public.profiles TO service_role;

-- ──────────────────────────────────────────────────────────────
-- 2. SECURITY DEFINER-funktioner til egne følsomme data
-- ──────────────────────────────────────────────────────────────

-- Brugerens egne følsomme profilfelter (phone + stripe)
CREATE OR REPLACE FUNCTION public.get_my_sensitive_profile()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'phone',                    phone,
    'stripe_account_id',        stripe_account_id,
    'stripe_onboarding_complete', stripe_onboarding_complete
  )
  FROM profiles
  WHERE id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_sensitive_profile() TO authenticated;

-- Cabin-ejers Stripe-info til bookingflow (gæst henter ejerens data)
-- Returnerer kun info for publicerede, ikke-slettede hytter
CREATE OR REPLACE FUNCTION public.get_owner_stripe_info(p_cabin_id uuid)
RETURNS TABLE(stripe_account_id text, stripe_onboarding_complete boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.stripe_account_id, p.stripe_onboarding_complete
  FROM profiles p
  JOIN cabins c ON c.owner_id = p.id
  WHERE c.id = p_cabin_id
    AND c.published = true
    AND c.deleted_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION public.get_owner_stripe_info(uuid) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 3. ALVORLIG: cabin_bookings_update — gæst kan skrive
--    total_price_ore, platform_fee_ore, stripe_session_id osv.
--    Fix: trigger der blokkerer ændring af betalingsfelter
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cabin_bookings_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Service-role (auth.uid() IS NULL) har lov til at opdatere alt
  -- (webhooks, backend-processer)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ingen bruger må ændre disse felter
  IF NEW.total_price_ore IS DISTINCT FROM OLD.total_price_ore THEN
    RAISE EXCEPTION 'total_price_ore kan ikke ændres';
  END IF;
  IF NEW.platform_fee_ore IS DISTINCT FROM OLD.platform_fee_ore THEN
    RAISE EXCEPTION 'platform_fee_ore kan ikke ændres';
  END IF;
  IF NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id THEN
    RAISE EXCEPTION 'stripe_session_id kan ikke ændres';
  END IF;
  IF NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id THEN
    RAISE EXCEPTION 'stripe_payment_intent_id kan ikke ændres';
  END IF;
  IF NEW.guest_id IS DISTINCT FROM OLD.guest_id THEN
    RAISE EXCEPTION 'guest_id kan ikke ændres';
  END IF;
  IF NEW.cabin_id IS DISTINCT FROM OLD.cabin_id THEN
    RAISE EXCEPTION 'cabin_id kan ikke ændres';
  END IF;
  IF NEW.check_in IS DISTINCT FROM OLD.check_in THEN
    RAISE EXCEPTION 'check_in kan ikke ændres';
  END IF;
  IF NEW.check_out IS DISTINCT FROM OLD.check_out THEN
    RAISE EXCEPTION 'check_out kan ikke ændres';
  END IF;
  IF NEW.num_guests IS DISTINCT FROM OLD.num_guests THEN
    RAISE EXCEPTION 'num_guests kan ikke ændres';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cabin_bookings_guard_update ON public.cabin_bookings;
CREATE TRIGGER trg_cabin_bookings_guard_update
  BEFORE UPDATE ON public.cabin_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.cabin_bookings_guard_update();

-- ──────────────────────────────────────────────────────────────
-- 4. ALVORLIG: handle_new_user — brug aldrig email som fallback
--    (privatlivsregel: e-mail må aldrig vises i UI)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      'Sila-bruger'
    )
  );
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 5. ALVORLIG: Duplikat profiles UPDATE-policy — fjern den ene
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS profiles_update_owner ON public.profiles;
-- profiles_update_own bevares (id = auth.uid())

-- ──────────────────────────────────────────────────────────────
-- 6. ALVORLIG: boats_owner_all bruger {public} rolle
--    Bør bruge authenticated
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS boats_owner_all ON public.boats;
CREATE POLICY "boats_owner_all"
  ON public.boats
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- 7. LAV: reviews kun læselige for authenticated
--    Anonyme besøgende på /hytter/[id] bør også se anmeldelser
-- ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS reviews_select_authenticated ON public.reviews;
CREATE POLICY "reviews_select_public"
  ON public.reviews
  FOR SELECT
  TO public
  USING (deleted_at IS NULL);

-- ──────────────────────────────────────────────────────────────
-- 8. LAV: Manglende indexes på foreign keys
-- ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_boats_owner_id
  ON public.boats (owner_id);

CREATE INDEX IF NOT EXISTS idx_messages_cabin_booking_id
  ON public.messages (cabin_booking_id);

CREATE INDEX IF NOT EXISTS idx_messages_ride_share_booking_id
  ON public.messages (ride_share_booking_id);

CREATE INDEX IF NOT EXISTS idx_messages_transport_request_id
  ON public.messages (transport_request_id);

CREATE INDEX IF NOT EXISTS idx_reviews_cabin_booking_id
  ON public.reviews (cabin_booking_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id
  ON public.reviews (reviewer_id);

CREATE INDEX IF NOT EXISTS idx_reviews_ride_share_booking_id
  ON public.reviews (ride_share_booking_id);

CREATE INDEX IF NOT EXISTS idx_ride_shares_boat_id
  ON public.ride_shares (boat_id);

CREATE INDEX IF NOT EXISTS idx_transport_requests_guest_id
  ON public.transport_requests (guest_id);

CREATE INDEX IF NOT EXISTS idx_transport_requests_linked_cabin_booking_id
  ON public.transport_requests (linked_cabin_booking_id);
