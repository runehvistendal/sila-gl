-- stay_requests (tidligere cabin_requests) + stay_offers

-- ── 1) Omdøb tabel ─────────────────────────────────────────────────────
ALTER TABLE public.cabin_requests RENAME TO stay_requests;

-- Indekser (navne følger stadig præfix cabin_requests_* efter rename)
-- Indekser: omdøb hvis de stadig har gamle navne (miljøer kan afvige)
DO $rename_idx$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'cabin_requests_guest_id_idx'
  ) THEN
    ALTER INDEX public.cabin_requests_guest_id_idx RENAME TO stay_requests_guest_id_idx;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'cabin_requests_cabin_id_idx'
  ) THEN
    ALTER INDEX public.cabin_requests_cabin_id_idx RENAME TO stay_requests_cabin_id_idx;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'cabin_requests_location_idx'
  ) THEN
    ALTER INDEX public.cabin_requests_location_idx RENAME TO stay_requests_location_idx;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'cabin_requests_status_idx'
  ) THEN
    ALTER INDEX public.cabin_requests_status_idx RENAME TO stay_requests_status_idx;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'cabin_requests_deleted_at_idx'
  ) THEN
    ALTER INDEX public.cabin_requests_deleted_at_idx RENAME TO stay_requests_deleted_at_idx;
  END IF;
END
$rename_idx$;

-- updated_at-trigger for stay_requests
CREATE OR REPLACE FUNCTION update_stay_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cabin_requests_updated_at ON stay_requests;
CREATE TRIGGER stay_requests_updated_at
  BEFORE UPDATE ON stay_requests
  FOR EACH ROW EXECUTE FUNCTION update_stay_requests_updated_at();

DROP FUNCTION IF EXISTS update_cabin_requests_updated_at();

-- ── 2) property_type (migrer desired_property_type → property_type) ──────
ALTER TABLE stay_requests ADD COLUMN property_type text;

UPDATE stay_requests SET property_type = desired_property_type;

ALTER TABLE stay_requests
  ALTER COLUMN property_type SET DEFAULT 'any',
  ALTER COLUMN property_type SET NOT NULL;

ALTER TABLE stay_requests
  ADD CONSTRAINT stay_requests_property_type_check
  CHECK (property_type IN ('cabin', 'residence', 'any'));

ALTER TABLE stay_requests DROP COLUMN desired_property_type;

COMMENT ON COLUMN stay_requests.property_type IS 'Ønsket opholdstype: hytte, bolig eller begge (any).';

-- ── 3) RLS: drop gamle policies ──────────────────────────────────────────
DROP POLICY IF EXISTS "cabin_requests_guest_select" ON stay_requests;
DROP POLICY IF EXISTS "cabin_requests_owner_select" ON stay_requests;
DROP POLICY IF EXISTS "cabin_requests_open_select" ON stay_requests;
DROP POLICY IF EXISTS "cabin_requests_insert" ON stay_requests;
DROP POLICY IF EXISTS "cabin_requests_guest_update" ON stay_requests;

-- Gæst: egne rækker. Øvrige innloggede: alle ikke-slettede (udbydere ser åbne m.m.)
CREATE POLICY "stay_requests_select_guest_or_authenticated"
  ON stay_requests FOR SELECT
  USING (
    deleted_at IS NULL
    AND (guest_id = auth.uid() OR auth.uid() IS NOT NULL)
  );

CREATE POLICY "stay_requests_insert_guest"
  ON stay_requests FOR INSERT
  WITH CHECK (guest_id = auth.uid());

CREATE POLICY "stay_requests_update_guest"
  ON stay_requests FOR UPDATE
  USING (guest_id = auth.uid())
  WITH CHECK (guest_id = auth.uid());

-- ── 4) stay_offers ─────────────────────────────────────────────────────────
CREATE TABLE stay_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_request_id uuid NOT NULL REFERENCES stay_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id),
  cabin_id uuid NOT NULL REFERENCES cabins(id),
  offered_price_ore integer NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stay_offers_stay_request_id_idx ON stay_offers(stay_request_id);
CREATE INDEX stay_offers_provider_id_idx ON stay_offers(provider_id);
CREATE INDEX stay_offers_cabin_id_idx ON stay_offers(cabin_id);

CREATE TRIGGER trg_stay_offers_updated_at
  BEFORE UPDATE ON stay_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE stay_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stay_offers_select_guest_or_provider"
  ON stay_offers FOR SELECT
  USING (
    provider_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM stay_requests sr
      WHERE sr.id = stay_offers.stay_request_id
        AND sr.guest_id = auth.uid()
        AND sr.deleted_at IS NULL
    )
  );

CREATE POLICY "stay_offers_insert_provider"
  ON stay_offers FOR INSERT
  WITH CHECK (
    provider_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM cabins c
      WHERE c.id = stay_offers.cabin_id
        AND c.owner_id = auth.uid()
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY "stay_offers_update_provider_while_pending"
  ON stay_offers FOR UPDATE
  USING (provider_id = auth.uid() AND status = 'pending')
  WITH CHECK (provider_id = auth.uid());

-- ── 5) admin_key_metrics: tæl stay_requests ──────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_key_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      (timezone('utc', now()) - INTERVAL '30 days') AS d30,
      date_trunc('month', timezone('utc', now())::timestamptz) AS cur_month_start
  ),
  merged_monthly AS (
    SELECT month_start, SUM(ore)::bigint AS total_ore
    FROM (
      SELECT date_trunc('month', cb.created_at) AS month_start, cb.total_price_ore::bigint AS ore
      FROM cabin_bookings cb
      WHERE cb.status = 'confirmed'
        AND cb.deleted_at IS NULL
        AND cb.created_at >= (SELECT cur_month_start - INTERVAL '5 months' FROM bounds)
      UNION ALL
      SELECT date_trunc('month', rsb.created_at), rsb.total_price_ore::bigint
      FROM ride_share_bookings rsb
      WHERE rsb.status = 'confirmed'
        AND rsb.deleted_at IS NULL
        AND rsb.created_at >= (SELECT cur_month_start - INTERVAL '5 months' FROM bounds)
      UNION ALL
      SELECT date_trunc('month', tof.updated_at), tof.price_ore::bigint
      FROM transport_offers tof
      WHERE tof.status = 'accepted'
        AND tof.deleted_at IS NULL
        AND tof.updated_at >= (SELECT cur_month_start - INTERVAL '5 months' FROM bounds)
    ) u
    GROUP BY month_start
  )
  SELECT jsonb_build_object(
    'cabin_revenue_total_ore',
      (SELECT COALESCE(SUM(total_price_ore)::bigint, 0) FROM cabin_bookings WHERE status = 'confirmed' AND deleted_at IS NULL),
    'ride_share_revenue_total_ore',
      (SELECT COALESCE(SUM(total_price_ore)::bigint, 0) FROM ride_share_bookings WHERE status = 'confirmed' AND deleted_at IS NULL),
    'transport_revenue_total_ore',
      (SELECT COALESCE(SUM(price_ore)::bigint, 0) FROM transport_offers WHERE status = 'accepted' AND deleted_at IS NULL),
    'platform_fee_total_ore',
      (SELECT COALESCE(SUM(platform_fee_ore)::bigint, 0) FROM cabin_bookings WHERE status = 'confirmed' AND deleted_at IS NULL)
      + (SELECT COALESCE(SUM(platform_fee_ore)::bigint, 0) FROM ride_share_bookings WHERE status = 'confirmed' AND deleted_at IS NULL),

    'revenue_last_30d_ore',
      (SELECT COALESCE(SUM(total_price_ore)::bigint, 0) FROM cabin_bookings WHERE status = 'confirmed' AND deleted_at IS NULL AND created_at >= (SELECT d30 FROM bounds))
      + (SELECT COALESCE(SUM(total_price_ore)::bigint, 0) FROM ride_share_bookings WHERE status = 'confirmed' AND deleted_at IS NULL AND created_at >= (SELECT d30 FROM bounds))
      + (SELECT COALESCE(SUM(price_ore)::bigint, 0) FROM transport_offers WHERE status = 'accepted' AND deleted_at IS NULL AND updated_at >= (SELECT d30 FROM bounds)),

    'monthly_revenue',
      COALESCE(
        (SELECT jsonb_agg(
            jsonb_build_object(
              'month_start', to_char(mm.month_start AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
              'total_ore', mm.total_ore
            )
            ORDER BY mm.month_start
          )
         FROM merged_monthly mm),
        '[]'::jsonb
      ),

    'bookings_cabin_confirmed',
      (SELECT COUNT(*)::bigint FROM cabin_bookings WHERE status = 'confirmed' AND deleted_at IS NULL),
    'bookings_ride_share_confirmed',
      (SELECT COUNT(*)::bigint FROM ride_share_bookings WHERE status = 'confirmed' AND deleted_at IS NULL),
    'bookings_transport_accepted',
      (SELECT COUNT(*)::bigint FROM transport_offers WHERE status = 'accepted' AND deleted_at IS NULL),

    'bookings_cabin_confirmed_30d',
      (SELECT COUNT(*)::bigint FROM cabin_bookings WHERE status = 'confirmed' AND deleted_at IS NULL AND created_at >= (SELECT d30 FROM bounds)),
    'bookings_ride_share_confirmed_30d',
      (SELECT COUNT(*)::bigint FROM ride_share_bookings WHERE status = 'confirmed' AND deleted_at IS NULL AND created_at >= (SELECT d30 FROM bounds)),
    'bookings_transport_accepted_30d',
      (SELECT COUNT(*)::bigint FROM transport_offers WHERE status = 'accepted' AND deleted_at IS NULL AND updated_at >= (SELECT d30 FROM bounds)),

    'bookings_cancelled_cabin',
      (SELECT COUNT(*)::bigint FROM cabin_bookings WHERE status = 'cancelled' AND deleted_at IS NULL),
    'bookings_cancelled_ride_share',
      (SELECT COUNT(*)::bigint FROM ride_share_bookings WHERE status = 'cancelled' AND deleted_at IS NULL),

    'users_total',
      (SELECT COUNT(*)::bigint FROM profiles WHERE deleted_at IS NULL),
    'users_new_30d',
      (SELECT COUNT(*)::bigint FROM profiles WHERE deleted_at IS NULL AND created_at >= (SELECT d30 FROM bounds)),
    'users_role_traveler',
      (SELECT COUNT(*)::bigint FROM profiles WHERE deleted_at IS NULL AND role_type = 'traveler'),
    'users_role_provider',
      (SELECT COUNT(*)::bigint FROM profiles WHERE deleted_at IS NULL AND role_type = 'provider'),
    'users_role_both',
      (SELECT COUNT(*)::bigint FROM profiles WHERE deleted_at IS NULL AND role_type = 'both'),

    'cabins_published',
      (SELECT COUNT(*)::bigint FROM cabins WHERE published = true AND deleted_at IS NULL),
    'cabins_draft',
      (SELECT COUNT(*)::bigint FROM cabins WHERE published = false AND deleted_at IS NULL),
    'skippers_with_ride_share',
      (SELECT COUNT(DISTINCT skipper_id)::bigint FROM ride_shares WHERE deleted_at IS NULL),
    'profiles_stripe_onboarding_complete',
      (SELECT COUNT(*)::bigint FROM profiles WHERE deleted_at IS NULL AND stripe_onboarding_complete = true),

    'cabin_requests_open',
      (SELECT COUNT(*)::bigint FROM stay_requests WHERE status = 'open' AND deleted_at IS NULL),
    'transport_requests_open',
      (SELECT COUNT(*)::bigint FROM transport_requests WHERE status = 'open' AND deleted_at IS NULL),

    'avg_booking_value_ore',
      CASE
        WHEN (
          (SELECT COUNT(*)::bigint FROM cabin_bookings WHERE status = 'confirmed' AND deleted_at IS NULL)
          + (SELECT COUNT(*)::bigint FROM ride_share_bookings WHERE status = 'confirmed' AND deleted_at IS NULL)
          + (SELECT COUNT(*)::bigint FROM transport_offers WHERE status = 'accepted' AND deleted_at IS NULL)
        ) = 0
        THEN 0::bigint
        ELSE (
          ROUND(
            (
              (SELECT COALESCE(SUM(total_price_ore)::numeric, 0) FROM cabin_bookings WHERE status = 'confirmed' AND deleted_at IS NULL)
              + (SELECT COALESCE(SUM(total_price_ore)::numeric, 0) FROM ride_share_bookings WHERE status = 'confirmed' AND deleted_at IS NULL)
              + (SELECT COALESCE(SUM(price_ore)::numeric, 0) FROM transport_offers WHERE status = 'accepted' AND deleted_at IS NULL)
            )
            / NULLIF(
              (SELECT COUNT(*)::numeric FROM cabin_bookings WHERE status = 'confirmed' AND deleted_at IS NULL)
              + (SELECT COUNT(*)::numeric FROM ride_share_bookings WHERE status = 'confirmed' AND deleted_at IS NULL)
              + (SELECT COUNT(*)::numeric FROM transport_offers WHERE status = 'accepted' AND deleted_at IS NULL),
              0
            )
          )
        )::bigint
      END
  );
$$;

REVOKE ALL ON FUNCTION public.admin_key_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_key_metrics() TO service_role;
