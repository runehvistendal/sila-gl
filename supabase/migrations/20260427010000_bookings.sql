-- Stripe Checkout: kobling fra cabin_booking til Checkout Session
-- status, stripe_payment_intent_id findes allerede (booking_status-enum, kolonne)
ALTER TABLE public.cabin_bookings
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

COMMENT ON COLUMN public.cabin_bookings.stripe_session_id IS
  'Stripe Checkout Session id (cs_...). Sættes efter oprettet session.';
