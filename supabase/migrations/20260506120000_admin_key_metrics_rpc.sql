-- Admin dashboard: ét samlet metrics-json (kun service_role må kalde)
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
      (SELECT COUNT(*)::bigint FROM cabin_requests WHERE status = 'open' AND deleted_at IS NULL),
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

COMMENT ON FUNCTION public.admin_key_metrics() IS
  'Aggregerede admin-nøgletal. Kun service_role. Kaldes fra Next.js admin (server).';
