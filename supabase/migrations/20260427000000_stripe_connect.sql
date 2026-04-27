-- Stripe Connect (idempotent): kolonner kan allerede findes fra 20260426120000_initial_schema.sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.stripe_account_id IS
  'Stripe Connect konto-ID — sættes når udbyderen gennemfører onboarding.';
COMMENT ON COLUMN public.profiles.stripe_onboarding_complete IS
  'True når Stripe Connect onboarding er fuldført og udbetalinger er mulige.';
