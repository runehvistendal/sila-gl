-- Fjern atv fra transport_type check og migrer eventuelle atv-rækker
ALTER TABLE transfer_routes DROP CONSTRAINT IF EXISTS transfer_routes_transport_type_check;

UPDATE transfer_routes SET transport_type = 'other' WHERE transport_type = 'atv';

ALTER TABLE transfer_routes ADD CONSTRAINT transfer_routes_transport_type_check
  CHECK (transport_type IN ('boat', 'car', 'other'));
