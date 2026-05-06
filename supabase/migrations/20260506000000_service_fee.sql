-- 3 % service fee (stored in øre): guest-facing line item separate from provider net (total_price_ore).

ALTER TABLE public.cabin_bookings
  ADD COLUMN IF NOT EXISTS service_fee_ore integer NOT NULL DEFAULT 0;

ALTER TABLE public.ride_share_bookings
  ADD COLUMN IF NOT EXISTS service_fee_ore integer NOT NULL DEFAULT 0;

ALTER TABLE public.transport_offers
  ADD COLUMN IF NOT EXISTS service_fee_ore integer NOT NULL DEFAULT 0;

-- Immutable alongside other payment snapshot fields
CREATE OR REPLACE FUNCTION public.cabin_bookings_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.total_price_ore IS DISTINCT FROM OLD.total_price_ore THEN
    RAISE EXCEPTION 'total_price_ore kan ikke ændres';
  END IF;
  IF NEW.platform_fee_ore IS DISTINCT FROM OLD.platform_fee_ore THEN
    RAISE EXCEPTION 'platform_fee_ore kan ikke ændres';
  END IF;
  IF NEW.service_fee_ore IS DISTINCT FROM OLD.service_fee_ore THEN
    RAISE EXCEPTION 'service_fee_ore kan ikke ændres';
  END IF;
  IF NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id THEN
    RAISE EXCEPTION 'stripe_session_id kan ikke ændres';
  END IF;
  IF NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id THEN
    RAISE EXCEPTION 'stripe_payment_intent_id kan ikke ændres';
  END IF;
  IF NEW.guest_id IS DISTINCT FROM OLD.guest_id THEN
    RAISE EXCEPTION 'guest_id kan ikke ændres';
  END IF;
  IF NEW.cabin_id IS DISTINCT FROM OLD.cabin_id THEN
    RAISE EXCEPTION 'cabin_id kan ikke ændres';
  END IF;
  IF NEW.check_in IS DISTINCT FROM OLD.check_in THEN
    RAISE EXCEPTION 'check_in kan ikke ændres';
  END IF;
  IF NEW.check_out IS DISTINCT FROM OLD.check_out THEN
    RAISE EXCEPTION 'check_out kan ikke ændres';
  END IF;
  IF NEW.num_guests IS DISTINCT FROM OLD.num_guests THEN
    RAISE EXCEPTION 'num_guests kan ikke ændres';
  END IF;

  RETURN NEW;
END;
$$;
