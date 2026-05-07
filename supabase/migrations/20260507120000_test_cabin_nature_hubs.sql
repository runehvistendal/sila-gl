-- Demo-hytter (Malik Olsen, Sara Heilmann, Hans Egede): hub sættes til naturlokationer.
-- Betingelser (id + owner_id + property_type) sikrer at produktionsdata ikke røres.

UPDATE public.cabins
SET location_hub = 'Qooqqut'
WHERE id = 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa'
  AND property_type = 'cabin'
  AND owner_id = '11111111-1111-1111-1111-111111111111';

UPDATE public.cabins
SET location_hub = 'Eqip Sermia'
WHERE id = 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa'
  AND property_type = 'cabin'
  AND owner_id = '22222222-2222-2222-2222-222222222222';

UPDATE public.cabins
SET location_hub = 'Kangerluarsunnguaq'
WHERE id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa'
  AND property_type = 'cabin'
  AND owner_id = '33333333-3333-3333-3333-333333333333';
