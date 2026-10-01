-- Sila.gl — hærdning af ride_shares-guard (opfølgning på 20261001100000)
--
-- Fundet ved lokal migrationstest:
--  1. Med aktive bookinger kunne sejleren stadig soft-delete turen, sætte
--     status til 'completed'/'full', ændre tur/retur-pris og koordinater.
--     Soft-delete og statusskift sprang refusionen over.
--  2. CHECK (total_seats <= 12) NOT VALID fastlåser ældre rækker med > 12
--     pladser: enhver senere UPDATE (booking, cron) fejler på dem.
--     Erstattes af en trigger, der kun tjekker når total_seats sættes/ændres.

-- ── 1. 12-pax-loft som trigger i stedet for CHECK ───────────────────────
ALTER TABLE public.ride_shares
  DROP CONSTRAINT IF EXISTS ride_shares_max_12_passengers;

CREATE OR REPLACE FUNCTION public.ride_shares_max_passengers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.total_seats > 12 THEN
    RAISE EXCEPTION 'En tur kan højst have 12 passagerer' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ride_shares_max_passengers ON public.ride_shares;
CREATE TRIGGER trg_ride_shares_max_passengers
  BEFORE INSERT OR UPDATE OF total_seats ON public.ride_shares
  FOR EACH ROW EXECUTE FUNCTION public.ride_shares_max_passengers();

-- ── 2. Guard: lås alt der påvirker passagerer, når der er bookinger ─────
CREATE OR REPLACE FUNCTION public.ride_shares_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  has_bookings boolean;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  -- Pladser vedligeholdes kun af ride_share_seat_hold
  IF NEW.seats_available IS DISTINCT FROM OLD.seats_available
     OR NEW.total_seats IS DISTINCT FROM OLD.total_seats THEN
    RAISE EXCEPTION 'Pladser kan ikke ændres direkte' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.ride_share_bookings b
    WHERE b.ride_share_id = OLD.id
      AND b.status IN ('pending', 'confirmed')
  ) INTO has_bookings;

  IF has_bookings THEN
    IF NEW.price_per_seat_ore            IS DISTINCT FROM OLD.price_per_seat_ore
       OR NEW.price_per_seat_roundtrip_ore IS DISTINCT FROM OLD.price_per_seat_roundtrip_ore
       OR NEW.departure_at               IS DISTINCT FROM OLD.departure_at
       OR NEW.from_location              IS DISTINCT FROM OLD.from_location
       OR NEW.to_location                IS DISTINCT FROM OLD.to_location
       OR NEW.from_latitude              IS DISTINCT FROM OLD.from_latitude
       OR NEW.from_longitude             IS DISTINCT FROM OLD.from_longitude
       OR NEW.to_latitude                IS DISTINCT FROM OLD.to_latitude
       OR NEW.to_longitude               IS DISTINCT FROM OLD.to_longitude THEN
      RAISE EXCEPTION 'Rute, tid og pris kan ikke ændres når der er bookinger'
        USING ERRCODE = '42501';
    END IF;
    -- Aflysning, sletning og statusskift med passagerer skal gå via serveren,
    -- så passagererne refunderes og får besked.
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      RAISE EXCEPTION 'Aflys via Sila, så passagererne refunderes'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
