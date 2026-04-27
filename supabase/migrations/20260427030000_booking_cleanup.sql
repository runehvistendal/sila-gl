-- =============================================================
-- SILA.GL — BOOKING CLEANUP (pg_cron)
-- Auto-annuller pending bookinger der er ældre end 15 minutter
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Slet evt. eksisterende job (idempotent)
SELECT cron.unschedule('cancel-expired-pending-bookings')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cancel-expired-pending-bookings'
);

SELECT cron.schedule(
  'cancel-expired-pending-bookings',
  '*/5 * * * *',
  $$
    UPDATE public.cabin_bookings
    SET
      status           = 'cancelled',
      cancelled_at     = NOW(),
      cancellation_reason = 'expired',
      updated_at       = NOW()
    WHERE status    = 'pending'
      AND created_at < NOW() - INTERVAL '15 minutes';
  $$
);
