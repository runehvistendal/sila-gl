-- Kontaktinfo synlig indtil: efter udløb skjules data i get_contact_info_for_booking

ALTER TABLE public.cabin_bookings
  ADD COLUMN IF NOT EXISTS contact_info_visible_until TIMESTAMPTZ;

ALTER TABLE public.ride_share_bookings
  ADD COLUMN IF NOT EXISTS contact_info_visible_until TIMESTAMPTZ;

ALTER TABLE public.transport_offers
  ADD COLUMN IF NOT EXISTS contact_info_visible_until TIMESTAMPTZ;

ALTER TABLE public.stay_offers
  ADD COLUMN IF NOT EXISTS contact_info_visible_until TIMESTAMPTZ;

COMMENT ON COLUMN public.cabin_bookings.contact_info_visible_until IS
  'Efter dette tidspunkt returnerer get_contact_info_for_booking ikke længere modpartens kontaktinfo. NULL = ingen tidsbegrænsning.';
COMMENT ON COLUMN public.ride_share_bookings.contact_info_visible_until IS
  'Efter dette tidspunkt returnerer get_contact_info_for_booking ikke længere modpartens kontaktinfo. NULL = ingen tidsbegrænsning.';
COMMENT ON COLUMN public.transport_offers.contact_info_visible_until IS
  'Efter dette tidspunkt returnerer get_contact_info_for_booking ikke længere modpartens kontaktinfo. NULL = ingen tidsbegrænsning.';
COMMENT ON COLUMN public.stay_offers.contact_info_visible_until IS
  'Efter dette tidspunkt returnerer get_contact_info_for_booking ikke længere modpartens kontaktinfo. NULL = ingen tidsbegrænsning.';

CREATE OR REPLACE FUNCTION get_contact_info_for_booking(
  p_booking_type TEXT,
  p_booking_id UUID
)
RETURNS TABLE (
  full_name TEXT,
  phone TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_user_id UUID;
  v_confirmed BOOLEAN := FALSE;
BEGIN
  IF p_booking_type = 'cabin' THEN
    SELECT
      CASE
        WHEN cb.guest_id = auth.uid() THEN c.owner_id
        WHEN c.owner_id = auth.uid() THEN cb.guest_id
      END,
      cb.status = 'confirmed'
    INTO v_other_user_id, v_confirmed
    FROM cabin_bookings cb
    JOIN cabins c ON c.id = cb.cabin_id
    WHERE cb.id = p_booking_id
      AND (cb.guest_id = auth.uid() OR c.owner_id = auth.uid())
      AND (
        cb.contact_info_visible_until IS NULL
        OR cb.contact_info_visible_until > now()
      );

  ELSIF p_booking_type = 'ride_share' THEN
    SELECT
      CASE
        WHEN rsb.passenger_id = auth.uid() THEN rs.skipper_id
        WHEN rs.skipper_id = auth.uid() THEN rsb.passenger_id
      END,
      rsb.status = 'confirmed'
    INTO v_other_user_id, v_confirmed
    FROM ride_share_bookings rsb
    JOIN ride_shares rs ON rs.id = rsb.ride_share_id
    WHERE rsb.id = p_booking_id
      AND (rsb.passenger_id = auth.uid() OR rs.skipper_id = auth.uid())
      AND (
        rsb.contact_info_visible_until IS NULL
        OR rsb.contact_info_visible_until > now()
      );

  ELSIF p_booking_type = 'transport_offer' THEN
    SELECT
      CASE
        WHEN tr.guest_id = auth.uid() THEN to2.skipper_id
        WHEN to2.skipper_id = auth.uid() THEN tr.guest_id
      END,
      to2.status = 'accepted'
    INTO v_other_user_id, v_confirmed
    FROM transport_offers to2
    JOIN transport_requests tr ON tr.id = to2.request_id
    WHERE to2.id = p_booking_id
      AND (tr.guest_id = auth.uid() OR to2.skipper_id = auth.uid())
      AND (
        to2.contact_info_visible_until IS NULL
        OR to2.contact_info_visible_until > now()
      );

  ELSIF p_booking_type = 'stay_offer' THEN
    SELECT
      CASE
        WHEN sr.guest_id = auth.uid() THEN so2.provider_id
        WHEN so2.provider_id = auth.uid() THEN sr.guest_id
      END,
      so2.status = 'accepted'
    INTO v_other_user_id, v_confirmed
    FROM stay_offers so2
    JOIN stay_requests sr ON sr.id = so2.stay_request_id
    WHERE so2.id = p_booking_id
      AND (sr.guest_id = auth.uid() OR so2.provider_id = auth.uid())
      AND (
        so2.contact_info_visible_until IS NULL
        OR so2.contact_info_visible_until > now()
      );
  END IF;

  IF v_confirmed AND v_other_user_id IS NOT NULL THEN
    RETURN QUERY
      SELECT
        p.full_name::text,
        p.phone::text,
        u.email::text
      FROM profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE p.id = v_other_user_id;
  END IF;
END;
$$;
