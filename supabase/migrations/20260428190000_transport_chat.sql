-- ============================================================
-- Transport chat: trip_type, num_seats, messages RLS,
-- offer stripe RPC
-- ============================================================

-- 1. trip_type + return_date on transport_requests
ALTER TABLE transport_requests
  ADD COLUMN IF NOT EXISTS trip_type   text NOT NULL DEFAULT 'one_way',
  ADD COLUMN IF NOT EXISTS return_date date;

-- 2. num_seats + stripe_session_id on transport_offers
ALTER TABLE transport_offers
  ADD COLUMN IF NOT EXISTS num_seats         integer,
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- 3. Messages SELECT RLS: extend to cover transport-chat participants
DROP POLICY IF EXISTS messages_select ON messages;
CREATE POLICY messages_select ON messages FOR SELECT USING (
  sender_id    = auth.uid()
  OR recipient_id = auth.uid()
  OR (
    transport_request_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM transport_requests tr
        WHERE tr.id  = messages.transport_request_id
          AND tr.guest_id = auth.uid()
          AND tr.deleted_at IS NULL
      )
      OR EXISTS (
        SELECT 1 FROM transport_offers tof
        WHERE tof.request_id = messages.transport_request_id
          AND tof.skipper_id = auth.uid()
          AND tof.deleted_at IS NULL
      )
    )
  )
);

-- 4. Secure RPC: get skipper's Stripe info for offer acceptance
--    Only callable by the request's guest (caller = auth.uid())
CREATE OR REPLACE FUNCTION get_transport_offer_stripe_info(p_offer_id uuid)
RETURNS TABLE(stripe_account_id text, stripe_onboarding_complete boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT p.stripe_account_id, p.stripe_onboarding_complete
    FROM   transport_offers tof
    JOIN   transport_requests tr ON tr.id = tof.request_id
    JOIN   profiles p            ON p.id  = tof.skipper_id
    WHERE  tof.id              = p_offer_id
      AND  tr.guest_id         = auth.uid()
      AND  tof.status          = 'pending'
      AND  tof.deleted_at      IS NULL;
END;
$$;

-- Index for messages by transport_request_id (already existed via migration check,
-- but add IF NOT EXISTS to be safe)
CREATE INDEX IF NOT EXISTS messages_transport_request_id_idx
  ON messages(transport_request_id);
