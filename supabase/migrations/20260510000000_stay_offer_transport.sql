-- Transportlinje på tilbud (øre). 0 når udbyder ikke tilbyder transport.
ALTER TABLE public.stay_offers
  ADD COLUMN IF NOT EXISTS transport_price_ore integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.stay_offers.transport_price_ore IS
  'Udbyders transportpris i tilbuddet (øre); lægges til ophold ved checkout.';
