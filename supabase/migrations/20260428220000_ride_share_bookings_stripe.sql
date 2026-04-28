-- ============================================================
-- ride_share_bookings: tilføj stripe_session_id
-- Secure RPC til skipper's Stripe-info (bruges i checkout)
-- ============================================================

-- 1. stripe_session_id til pending-booking tracking
ALTER TABLE ride_share_bookings
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- 2. SECURITY DEFINER RPC: hent skipperens Stripe-info for en aktiv ride_share
--    Kun kaldt fra checkout-route (server-side, autentificeret bruger)
CREATE OR REPLACE FUNCTION get_skipper_stripe_info(p_ride_share_id uuid)
RETURNS TABLE(stripe_account_id text, stripe_onboarding_complete boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT p.stripe_account_id, p.stripe_onboarding_complete
    FROM   ride_shares rs
    JOIN   profiles p ON p.id = rs.skipper_id
    WHERE  rs.id         = p_ride_share_id
      AND  rs.status     = 'active'::ride_share_status
      AND  rs.deleted_at IS NULL;
END;
$$;
