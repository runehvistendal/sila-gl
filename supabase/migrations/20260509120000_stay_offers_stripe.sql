-- Stripe Checkout-kobling for stay_offers (gæst accepterer tilbud)
ALTER TABLE public.stay_offers
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

COMMENT ON COLUMN public.stay_offers.stripe_session_id IS
  'Stripe Checkout Session id efter gæst starter betaling.';
COMMENT ON COLUMN public.stay_offers.stripe_payment_intent_id IS
  'Stripe PaymentIntent efter gennemført betaling (webhook).';
