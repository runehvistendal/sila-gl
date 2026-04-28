-- ============================================================
-- Reviews system: dobbelt-blind, tidsvindue, trigger, cron
-- ============================================================

-- 1. Nye kolonner
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS published_at  timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at    timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_role text;          -- 'guest' | 'provider'

-- Indeks til SELECT-queries der filtrerer på published_at
CREATE INDEX IF NOT EXISTS reviews_published_at_idx
  ON reviews(published_at) WHERE published_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS reviews_reviewee_id_idx
  ON reviews(reviewee_id);

-- 2. Opdatér SELECT-policy: kun publicerede anmeldelser synlige
DROP POLICY IF EXISTS reviews_select_public ON reviews;
CREATE POLICY reviews_select_public ON reviews FOR SELECT USING (
  deleted_at IS NULL AND published_at IS NOT NULL
);

-- 3. Trigger: publicér begge anmeldelser når modparten har anmeldt
CREATE OR REPLACE FUNCTION check_and_publish_reviews()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Undgå rekursion: spring over hvis allerede publiceret
  IF NEW.published_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Tjek om modpartens anmeldelse allerede eksisterer (upubliceret)
  IF EXISTS (
    SELECT 1 FROM reviews r2
    WHERE r2.reviewer_id  != NEW.reviewer_id
      AND r2.published_at IS NULL
      AND r2.deleted_at   IS NULL
      AND (
        (NEW.cabin_booking_id     IS NOT NULL AND r2.cabin_booking_id     = NEW.cabin_booking_id)
        OR (NEW.transport_offer_id  IS NOT NULL AND r2.transport_offer_id  = NEW.transport_offer_id)
        OR (NEW.ride_share_booking_id IS NOT NULL AND r2.ride_share_booking_id = NEW.ride_share_booking_id)
      )
  ) THEN
    -- Publicér begge anmeldelser
    UPDATE reviews
    SET    published_at = NOW()
    WHERE  deleted_at IS NULL
      AND  published_at IS NULL
      AND (
        (NEW.cabin_booking_id     IS NOT NULL AND cabin_booking_id     = NEW.cabin_booking_id)
        OR (NEW.transport_offer_id  IS NOT NULL AND transport_offer_id  = NEW.transport_offer_id)
        OR (NEW.ride_share_booking_id IS NOT NULL AND ride_share_booking_id = NEW.ride_share_booking_id)
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS publish_reviews_trigger ON reviews;
CREATE TRIGGER publish_reviews_trigger
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION check_and_publish_reviews();

-- 4. pg_cron: publicér anmeldelser hvis modpart aldrig svarer inden 30 dage
SELECT cron.schedule(
  'publish-expired-reviews',
  '0 * * * *',
  $$UPDATE reviews
    SET published_at = NOW()
    WHERE published_at IS NULL
      AND deleted_at   IS NULL
      AND expires_at  < NOW()$$
);
