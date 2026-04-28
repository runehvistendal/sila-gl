-- ============================================================
-- Fix reviews: tilføj transport_offer_id kolonne +
-- genopret INSERT-policy med korrekt transport-gren.
--
-- Korrektioner ift. original:
--   • reviews har ingen "booking_id" — bruger transport_offer_id (ny FK)
--   • transport_requests bruger guest_id, IKKE requester_id
-- ============================================================

-- 1. Ny kolonne til transport-anmeldelse
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS transport_offer_id uuid
    REFERENCES transport_offers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reviews_transport_offer_id_idx
  ON reviews(transport_offer_id);

-- 2. Drop eksisterende INSERT-policy
DROP POLICY IF EXISTS reviews_insert ON reviews;

-- 3. Genopret med korrekt transport-gren
CREATE POLICY reviews_insert ON reviews FOR INSERT WITH CHECK (
  reviewer_id = auth.uid()
  AND (
    -- Hyttebooking: gæst ELLER ejer på en completed booking
    (cabin_booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM cabin_bookings cb
      WHERE cb.id = reviews.cabin_booking_id
        AND cb.status = 'completed'::booking_status
        AND (
          cb.guest_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM cabins c
            WHERE c.id = cb.cabin_id AND c.owner_id = auth.uid()
          )
        )
    ))

    OR

    -- Samsejlads-booking: passager ELLER sejler på en completed booking
    (ride_share_booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM ride_share_bookings rsb
      WHERE rsb.id = reviews.ride_share_booking_id
        AND rsb.status = 'completed'::booking_status
        AND (
          rsb.passenger_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM ride_shares rs
            WHERE rs.id = rsb.ride_share_id AND rs.skipper_id = auth.uid()
          )
        )
    ))

    OR

    -- Transportbooking: gæsten på den anmodning det accepterede tilbud tilhører
    -- (guest_id — IKKE requester_id)
    (transport_offer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM transport_offers o
      JOIN transport_requests r ON r.id = o.request_id
      WHERE o.id = reviews.transport_offer_id
        AND o.status = 'accepted'
        AND r.guest_id = auth.uid()
    ))
  )
);
