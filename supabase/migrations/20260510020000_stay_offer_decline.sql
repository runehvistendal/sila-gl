-- Gæst kan afslå afventende tilbud; udvider status med 'declined'.

ALTER TABLE public.stay_offers
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS decline_reason text;

ALTER TABLE public.stay_offers
  DROP CONSTRAINT IF EXISTS stay_offers_status_check;

ALTER TABLE public.stay_offers
  ADD CONSTRAINT stay_offers_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'declined'));

COMMENT ON COLUMN public.stay_offers.declined_at IS 'Når gæst aktivt afslår tilbud.';
COMMENT ON COLUMN public.stay_offers.decline_reason IS 'Valgfri besked fra gæst til udbyder ved afslag.';

-- Gæst (ejer af stay_request) må opdatere egne afventende tilbud til status declined.
CREATE POLICY "stay_offers_update_guest_decline_pending"
  ON public.stay_offers FOR UPDATE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.stay_requests sr
      WHERE sr.id = stay_offers.stay_request_id
        AND sr.guest_id = auth.uid()
        AND sr.deleted_at IS NULL
    )
  )
  WITH CHECK (
    status = 'declined'
    AND EXISTS (
      SELECT 1
      FROM public.stay_requests sr
      WHERE sr.id = stay_offers.stay_request_id
        AND sr.guest_id = auth.uid()
        AND sr.deleted_at IS NULL
    )
  );
