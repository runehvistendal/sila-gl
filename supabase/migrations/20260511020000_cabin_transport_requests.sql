-- =============================================================
-- SILA.GL — Hyttespecifikke transportanmodninger + bud (udbydere)
-- Koblet til cabin på /ophold/i-naturen/[id]. Udløb efter 48 t.
-- =============================================================

-- ── cabin_transport_requests ─────────────────────────────────

CREATE TABLE public.cabin_transport_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabin_id uuid NOT NULL REFERENCES public.cabins(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  arrival_point text NOT NULL,
  arrival_date date NOT NULL,
  num_persons integer NOT NULL CHECK (num_persons >= 1),
  message text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cabin_transport_requests IS
  'Gæste-anmodning om transport til konkret hytte; udbydere byder via cabin_transport_offers.';
COMMENT ON COLUMN public.cabin_transport_requests.arrival_point IS
  'Ankomstpunkt — lufthavn, havn, helipad (tekstnøgle eller label).';

CREATE INDEX cabin_transport_requests_cabin_id_idx
  ON public.cabin_transport_requests (cabin_id);
CREATE INDEX cabin_transport_requests_guest_id_idx
  ON public.cabin_transport_requests (guest_id);
CREATE INDEX cabin_transport_requests_status_expires_idx
  ON public.cabin_transport_requests (status, expires_at);

CREATE TRIGGER trg_cabin_transport_requests_updated_at
  BEFORE UPDATE ON public.cabin_transport_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.cabin_transport_requests ENABLE ROW LEVEL SECURITY;

-- Alle innloggede må læse (udbydere skal kunne se åbne anmodninger på tværs).
CREATE POLICY cabin_transport_requests_select_authenticated
  ON public.cabin_transport_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY cabin_transport_requests_insert_guest
  ON public.cabin_transport_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (guest_id = auth.uid());

-- Gæst: egne rækker (fx annuller). Service_role omgår RLS ved serverjobs/webhooks.
CREATE POLICY cabin_transport_requests_update_guest
  ON public.cabin_transport_requests
  FOR UPDATE
  TO authenticated
  USING (guest_id = auth.uid())
  WITH CHECK (guest_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.cabin_transport_requests TO authenticated;
GRANT ALL ON public.cabin_transport_requests TO service_role;

-- ── cabin_transport_offers ────────────────────────────────────

CREATE TABLE public.cabin_transport_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.cabin_transport_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  price_ore integer NOT NULL CHECK (price_ore > 0),
  message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cabin_transport_offers_request_id_idx
  ON public.cabin_transport_offers (request_id);
CREATE INDEX cabin_transport_offers_provider_id_idx
  ON public.cabin_transport_offers (provider_id);

ALTER TABLE public.cabin_transport_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY cabin_transport_offers_select_guest_or_provider
  ON public.cabin_transport_offers
  FOR SELECT
  TO authenticated
  USING (
    provider_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.cabin_transport_requests r
      WHERE r.id = cabin_transport_offers.request_id
        AND r.guest_id = auth.uid()
    )
  );

CREATE POLICY cabin_transport_offers_insert_provider
  ON public.cabin_transport_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY cabin_transport_offers_update_provider
  ON public.cabin_transport_offers
  FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.cabin_transport_offers TO authenticated;
GRANT ALL ON public.cabin_transport_offers TO service_role;

-- ── pg_cron: udløb åbne anmodninger (samme idempotent mønster som booking cleanup) ──

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('expire-cabin-transport-requests')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-cabin-transport-requests'
);

SELECT cron.schedule(
  'expire-cabin-transport-requests',
  '*/15 * * * *',
  $$
    UPDATE public.cabin_transport_requests
    SET status = 'expired'
    WHERE status = 'open'
      AND expires_at < NOW();
  $$
);
