-- Fee model: 5% platform (host) + 12% service (guest). Pending snapshot alignment.

ALTER TABLE public.transport_offers
  ADD COLUMN IF NOT EXISTS platform_fee_ore integer NOT NULL DEFAULT 0;

ALTER TABLE public.stay_offers
  ADD COLUMN IF NOT EXISTS platform_fee_ore integer NOT NULL DEFAULT 0;

UPDATE public.cabin_bookings
SET platform_fee_ore = ROUND(total_price_ore * 0.05)
WHERE status = 'pending';

UPDATE public.ride_share_bookings
SET platform_fee_ore = ROUND(total_price_ore * 0.05)
WHERE status = 'pending';

UPDATE public.transport_offers
SET platform_fee_ore = ROUND(price_ore * 0.05)
WHERE status = 'pending';

UPDATE public.stay_offers
SET platform_fee_ore = ROUND((offered_price_ore + COALESCE(transport_price_ore, 0)) * 0.05)
WHERE status = 'pending';
