-- messages: stay_offer FK, tightened SELECT RLS, contact info RPC for confirmed bookings

-- ── 1. Tilføj manglende FK-kolonne ─────────────────────────────────────────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS stay_offer_id UUID
  REFERENCES stay_offers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS messages_stay_offer_id_idx
  ON messages(stay_offer_id);

-- ── 2. Erstat messages_select policy ───────────────────────────────────────
DROP POLICY IF EXISTS messages_select ON messages;

CREATE POLICY messages_select ON messages
  FOR SELECT
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
  );

-- ── 3. Kontaktinfo RPC ─────────────────────────────────────────────────────
-- Returnerer telefon + email for modparten i en bekræftet booking.
-- Virker for alle fire booking-typer.
-- Fejler lydløst (ingen række) hvis booking ikke er confirmed/accepted
-- eller den aktuelle bruger ikke er part i bookingen.

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
      AND (cb.guest_id = auth.uid() OR c.owner_id = auth.uid());

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
      AND (rsb.passenger_id = auth.uid() OR rs.skipper_id = auth.uid());

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
      AND (tr.guest_id = auth.uid() OR to2.skipper_id = auth.uid());

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
      AND (sr.guest_id = auth.uid() OR so2.provider_id = auth.uid());
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

REVOKE ALL ON FUNCTION get_contact_info_for_booking(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_contact_info_for_booking(TEXT, UUID)
  TO authenticated;
