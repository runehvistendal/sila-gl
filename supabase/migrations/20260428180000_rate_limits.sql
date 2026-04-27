-- Rate limits per bruger+handling (undgå misbrug af server actions)
CREATE TABLE public.rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  action text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action)
);

COMMENT ON TABLE public.rate_limits IS
  'Tæller for rate limiting; læses/skrives via consume_rate_limit (SECURITY DEFINER).';

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Ingen direkte klientadgang; kun RPC
CREATE POLICY "rate_limits_no_direct"
  ON public.rate_limits FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_user_id uuid,
  p_action text,
  p_max_attempts int,
  p_window_seconds int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO r
  FROM public.rate_limits
  WHERE user_id = p_user_id AND action = p_action
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (user_id, action, attempts, window_start)
    VALUES (p_user_id, p_action, 1, now());
    RETURN;
  END IF;

  IF r.window_start < now() - (p_window_seconds * interval '1 second') THEN
    UPDATE public.rate_limits
    SET attempts = 1, window_start = now()
    WHERE user_id = p_user_id AND action = p_action;
    RETURN;
  END IF;

  IF r.attempts >= p_max_attempts THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.rate_limits
  SET attempts = attempts + 1
  WHERE user_id = p_user_id AND action = p_action;
END;
$$;

REVOKE ALL ON public.rate_limits FROM public;
GRANT ALL ON public.rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(uuid, text, int, int) TO authenticated;
