-- Demo-hytte «Hytte ved Icefjord» (Malik Olsen): publicér så den vises på /ophold/i-naturen.
-- Betingelser matcher migration for natur-hubs — kun denne række.

UPDATE public.cabins
SET published = true
WHERE id = 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa'
  AND property_type = 'cabin'
  AND owner_id = '11111111-1111-1111-1111-111111111111'
  AND deleted_at IS NULL;
