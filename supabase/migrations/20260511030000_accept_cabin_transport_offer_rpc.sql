-- =============================================================
-- RPC: Gæst accepterer ét cabin_transport_offer og afviser øvrige
-- =============================================================

CREATE OR REPLACE FUNCTION public.accept_cabin_transport_offer(p_offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_guest_id uuid;
  v_request_status text;
  v_offer_status text;
BEGIN
  SELECT
    o.request_id,
    r.guest_id,
    r.status,
    o.status
  INTO
    v_request_id,
    v_guest_id,
    v_request_status,
    v_offer_status
  FROM public.cabin_transport_offers o
  INNER JOIN public.cabin_transport_requests r ON r.id = o.request_id
  WHERE o.id = p_offer_id;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'Offer not found.';
  END IF;

  IF v_guest_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the guest who created the transport request can accept an offer.';
  END IF;

  IF v_request_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'The transport request is not open.';
  END IF;

  IF v_offer_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'The offer is not pending.';
  END IF;

  UPDATE public.cabin_transport_offers
  SET status = 'accepted'
  WHERE id = p_offer_id;

  UPDATE public.cabin_transport_offers
  SET status = 'declined'
  WHERE request_id = v_request_id
    AND id IS DISTINCT FROM p_offer_id
    AND status = 'pending';

  UPDATE public.cabin_transport_requests
  SET status = 'accepted'
  WHERE id = v_request_id;
END;
$$;

COMMENT ON FUNCTION public.accept_cabin_transport_offer(uuid) IS
  'Guest accepts one cabin transport bid; declines other pending offers and closes the request (SECURITY DEFINER).';

GRANT EXECUTE ON FUNCTION public.accept_cabin_transport_offer(uuid) TO authenticated;
