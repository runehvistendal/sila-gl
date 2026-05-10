CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  reference_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brugere ser egne notifikationer"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT sker kun via service_role (omgår RLS). Ingen INSERT-policy for authenticated.

CREATE POLICY "Brugere markerer egne som læst"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX notifications_user_unread ON public.notifications (user_id)
  WHERE read_at IS NULL;

COMMENT ON TABLE public.notifications IS 'In-app notifikationer per bruger; INSERT via service client.';
