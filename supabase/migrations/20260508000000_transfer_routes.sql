-- Transfer-ruter pr. cabin/bolig-opslag (ankomstpunkt → destination på opslaget).

CREATE TABLE public.transfer_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabin_id uuid NOT NULL REFERENCES public.cabins (id) ON DELETE CASCADE,
  from_arrival_point text NOT NULL,
  transport_type text NOT NULL
    CHECK (transport_type IN ('boat', 'car', 'atv', 'other')),
  price_one_way_ore integer NOT NULL CHECK (price_one_way_ore >= 0),
  price_roundtrip_ore integer NOT NULL CHECK (price_roundtrip_ore >= 0),
  max_guests integer NOT NULL DEFAULT 4 CHECK (max_guests > 0),
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transfer_routes IS
  'Udbyderens transfer-ruter pr. opslag (fx lufthavn/havn → hytte). Priser i øre.';
COMMENT ON COLUMN public.transfer_routes.from_arrival_point IS
  'Fri nøgle/tekst for ankomstpunkt, fx nuuk_lufthavn, nuuk_havn.';

CREATE INDEX idx_transfer_routes_cabin_sort
  ON public.transfer_routes (cabin_id, sort_order);

ALTER TABLE public.transfer_routes ENABLE ROW LEVEL SECURITY;

-- Gæster og alle kan læse (opslagsvisning / booking)
CREATE POLICY "transfer_routes_select_all"
  ON public.transfer_routes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "transfer_routes_insert_owner"
  ON public.transfer_routes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cabins c
      WHERE c.id = cabin_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "transfer_routes_update_owner"
  ON public.transfer_routes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cabins c
      WHERE c.id = transfer_routes.cabin_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cabins c
      WHERE c.id = cabin_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "transfer_routes_delete_owner"
  ON public.transfer_routes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cabins c
      WHERE c.id = transfer_routes.cabin_id AND c.owner_id = auth.uid()
    )
  );

-- Snapshot på booking (checkout)
ALTER TABLE public.cabin_bookings
  ADD COLUMN IF NOT EXISTS transfer_route_id uuid REFERENCES public.transfer_routes (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transfer_price_ore integer,
  ADD COLUMN IF NOT EXISTS transfer_is_roundtrip boolean DEFAULT false;

COMMENT ON COLUMN public.cabin_bookings.transfer_route_id IS
  'Valgt transfer_rute ved booking; NULL = ingen transfer.';
COMMENT ON COLUMN public.cabin_bookings.transfer_price_ore IS
  'Transfer i øre (snapshot: enkelt eller tur/retur afhængigt af transfer_is_roundtrip).';

-- Udvid betalings-/snapshot-guard (samme mønster som service_fee_ore)
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
  IF NEW.transfer_route_id IS DISTINCT FROM OLD.transfer_route_id THEN
    RAISE EXCEPTION 'transfer_route_id kan ikke ændres';
  END IF;
  IF NEW.transfer_price_ore IS DISTINCT FROM OLD.transfer_price_ore THEN
    RAISE EXCEPTION 'transfer_price_ore kan ikke ændres';
  END IF;
  IF NEW.transfer_is_roundtrip IS DISTINCT FROM OLD.transfer_is_roundtrip THEN
    RAISE EXCEPTION 'transfer_is_roundtrip kan ikke ændres';
  END IF;

  RETURN NEW;
END;
$$;
