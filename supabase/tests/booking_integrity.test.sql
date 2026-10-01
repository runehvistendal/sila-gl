-- Integrationstest af 20261001100000_booking_integrity.sql
-- Kør mod en lokal Postgres med Supabase-stubs (se supabase/tests/README.md).
-- Hver test printer PASS/FAIL. Scriptet stopper ikke ved fejl.
\set QUIET on
\pset tuples_only on
SET client_min_messages = warning;

-- ── Seed (som postgres) ───────────────────────────────────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'skipper@test', '{"full_name":"Sejler"}'),
  ('00000000-0000-0000-0000-00000000000b', 'pax@test',     '{"full_name":"Passager"}'),
  ('00000000-0000-0000-0000-00000000000c', 'host@test',    '{"full_name":"Vært"}');

INSERT INTO ride_shares (id, skipper_id, from_location, from_latitude, from_longitude,
  to_location, to_latitude, to_longitude, departure_at, total_seats, seats_available,
  price_per_seat_ore, status)
VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
  'nuuk', 64.18, -51.72, 'qooqqut', 64.25, -51.2, now() + interval '5 days', 4, 4, 30000, 'active');

INSERT INTO cabins (id, owner_id, title, description, location_hub, latitude, longitude,
  max_guests, price_per_night_ore, access_type, published)
VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c',
  'Testhytte', 'x', 'Qooqqut', 64.25, -51.2, 4, 100000, 'boat', true);

CREATE OR REPLACE FUNCTION pg_temp.check(label text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN RAISE WARNING '%: %', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END, label; END $$;

CREATE OR REPLACE FUNCTION pg_temp.as_user(uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', uid::text, false);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', false);
END $$;

CREATE OR REPLACE FUNCTION pg_temp.seats() RETURNS int LANGUAGE sql AS $$
  SELECT seats_available FROM ride_shares WHERE id = '10000000-0000-0000-0000-000000000001' $$;

-- ── T1: gæst kan ikke oprette bekræftet hyttebooking ────────────────
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
SET ROLE authenticated;
DO $$ BEGIN
  INSERT INTO cabin_bookings (cabin_id, guest_id, check_in, check_out, num_guests, total_price_ore, platform_fee_ore, status)
  VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b',
          current_date + 10, current_date + 12, 2, 0, 0, 'confirmed');
  PERFORM pg_temp.check('T1 confirmed insert blokeret', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.check('T1 confirmed insert blokeret', true);
END $$;

-- ── T2: gæst kan ikke sætte contact_info_visible_until ──────────────
DO $$ BEGIN
  INSERT INTO cabin_bookings (cabin_id, guest_id, check_in, check_out, num_guests, total_price_ore, platform_fee_ore, status, contact_info_visible_until)
  VALUES ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b',
          current_date + 10, current_date + 12, 2, 0, 0, 'pending', now() + interval '1 year');
  PERFORM pg_temp.check('T2 contact_info insert blokeret', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.check('T2 contact_info insert blokeret', true);
END $$;

-- ── T3: pending insert er tilladt, men kan ikke bekræftes af gæst/vært ─
INSERT INTO cabin_bookings (id, cabin_id, guest_id, check_in, check_out, num_guests, total_price_ore, platform_fee_ore, status)
VALUES ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-00000000000b', current_date + 10, current_date + 12, 2, 200000, 10000, 'pending');
SELECT pg_temp.check('T3a pending insert tilladt', EXISTS (SELECT 1 FROM cabin_bookings WHERE id = '30000000-0000-0000-0000-000000000001'));
RESET ROLE;
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
SET ROLE authenticated;
DO $$ BEGIN
  UPDATE cabin_bookings SET status = 'confirmed' WHERE id = '30000000-0000-0000-0000-000000000001';
  PERFORM pg_temp.check('T3b vært kan ikke bekræfte ubetalt booking', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.check('T3b vært kan ikke bekræfte ubetalt booking', true);
END $$;
UPDATE cabin_bookings SET status = 'cancelled' WHERE id = '30000000-0000-0000-0000-000000000001';
SELECT pg_temp.check('T3c vært kan afvise pending', (SELECT status::text FROM cabin_bookings WHERE id = '30000000-0000-0000-0000-000000000001') = 'cancelled');
RESET ROLE;

-- ── T4: passager kan ikke indsætte ride_share_booking direkte ───────
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
SET ROLE authenticated;
DO $$ BEGIN
  INSERT INTO ride_share_bookings (ride_share_id, passenger_id, num_seats, total_price_ore, platform_fee_ore, status)
  VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 1, 0, 0, 'pending');
  PERFORM pg_temp.check('T4 direkte ride-booking blokeret', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.check('T4 direkte ride-booking blokeret', true);
END $$;
RESET ROLE;

-- ── T5: pladser holdes ved pending, ingen dobbelt-fradrag ved confirm ─
SET ROLE service_role;
INSERT INTO ride_share_bookings (id, ride_share_id, passenger_id, num_seats, total_price_ore, platform_fee_ore, status)
VALUES ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-00000000000b', 3, 90000, 4500, 'pending');
SELECT pg_temp.check('T5a 3 pladser holdt (4→1)', pg_temp.seats() = 1);
DO $$ BEGIN
  INSERT INTO ride_share_bookings (ride_share_id, passenger_id, num_seats, total_price_ore, platform_fee_ore, status)
  VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 2, 60000, 3000, 'pending');
  PERFORM pg_temp.check('T5b overbooking afvist', false);
EXCEPTION WHEN raise_exception THEN PERFORM pg_temp.check('T5b overbooking afvist', true);
END $$;
UPDATE ride_share_bookings SET status = 'confirmed' WHERE id = '40000000-0000-0000-0000-000000000001';
SELECT pg_temp.check('T5c confirm trækker ikke igen (stadig 1)', pg_temp.seats() = 1);
INSERT INTO ride_share_bookings (id, ride_share_id, passenger_id, num_seats, total_price_ore, platform_fee_ore, status)
VALUES ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-00000000000b', 1, 30000, 1500, 'pending');
SELECT pg_temp.check('T5d sidste plads → status full', (SELECT status::text FROM ride_shares WHERE id = '10000000-0000-0000-0000-000000000001') = 'full');
RESET ROLE;

-- ── T6: passager kan annullere pending (frigiver), ikke bekræfte ────
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
SET ROLE authenticated;
DO $$ BEGIN
  UPDATE ride_share_bookings SET status = 'confirmed' WHERE id = '40000000-0000-0000-0000-000000000002';
  PERFORM pg_temp.check('T6a passager kan ikke selv bekræfte', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.check('T6a passager kan ikke selv bekræfte', true);
END $$;
UPDATE ride_share_bookings SET status = 'cancelled' WHERE id = '40000000-0000-0000-0000-000000000002';
RESET ROLE;
SELECT pg_temp.check('T6b annullering frigiver plads og åbner turen',
  pg_temp.seats() = 1 AND (SELECT status::text FROM ride_shares WHERE id = '10000000-0000-0000-0000-000000000001') = 'active');
SELECT pg_temp.check('T6c seats_held nulstillet',
  NOT (SELECT seats_held FROM ride_share_bookings WHERE id = '40000000-0000-0000-0000-000000000002'));

-- ── T7: sejler kan ikke manipulere pladser/pris når der er bookinger ─
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
SET ROLE authenticated;
DO $$ BEGIN
  UPDATE ride_shares SET seats_available = 4 WHERE id = '10000000-0000-0000-0000-000000000001';
  PERFORM pg_temp.check('T7a direkte pladsændring blokeret', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.check('T7a direkte pladsændring blokeret', true);
END $$;
DO $$ BEGIN
  UPDATE ride_shares SET price_per_seat_ore = 99999 WHERE id = '10000000-0000-0000-0000-000000000001';
  PERFORM pg_temp.check('T7b prisændring med bookinger blokeret', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.check('T7b prisændring med bookinger blokeret', true);
END $$;
DO $$ BEGIN
  UPDATE ride_shares SET status = 'cancelled' WHERE id = '10000000-0000-0000-0000-000000000001';
  PERFORM pg_temp.check('T7c aflysning uden refusion blokeret', false);
EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.check('T7c aflysning uden refusion blokeret', true);
END $$;
UPDATE ride_shares SET description = 'Ny tekst' WHERE id = '10000000-0000-0000-0000-000000000001';
SELECT pg_temp.check('T7d beskrivelse kan stadig ændres', (SELECT description FROM ride_shares WHERE id = '10000000-0000-0000-0000-000000000001') = 'Ny tekst');
RESET ROLE;

-- ── T8: 12-pax-loft ─────────────────────────────────────────────────
DO $$ BEGIN
  INSERT INTO ride_shares (skipper_id, from_location, from_latitude, from_longitude, to_location, to_latitude, to_longitude,
    departure_at, total_seats, seats_available, price_per_seat_ore)
  VALUES ('00000000-0000-0000-0000-00000000000a', 'nuuk', 1, 1, 'kapisillit', 1, 1, now() + interval '2 days', 13, 13, 100);
  PERFORM pg_temp.check('T8 13 pladser afvist', false);
EXCEPTION WHEN check_violation THEN PERFORM pg_temp.check('T8 13 pladser afvist', true);
END $$;

-- ── T9: service-aflysning af bekræftet booking frigiver ─────────────
SET ROLE service_role;
UPDATE ride_share_bookings SET status = 'cancelled', cancellation_reason = 'weather' WHERE id = '40000000-0000-0000-0000-000000000001';
RESET ROLE;
SELECT pg_temp.check('T9 bekræftet aflyst → alle 4 pladser fri', pg_temp.seats() = 4);

-- ── T10: anonym kan ikke opdatere oplevelsesbookinger ───────────────
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('request.jwt.claim.role', 'anon', false);
SET ROLE anon;
DO $$ DECLARE n int; BEGIN
  UPDATE experience_bookings SET status = 'confirmed';
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.check('T10 anon kan ikke røre experience_bookings', n = 0);
EXCEPTION WHEN insufficient_privilege THEN PERFORM pg_temp.check('T10 anon kan ikke røre experience_bookings', true);
END $$;
RESET ROLE;
