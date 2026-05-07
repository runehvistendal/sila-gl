-- Kun boat | car som transport_type på transfer_routes
ALTER TABLE transfer_routes DROP CONSTRAINT IF EXISTS transfer_routes_transport_type_check;

UPDATE transfer_routes SET transport_type = 'car' WHERE transport_type = 'other';

ALTER TABLE transfer_routes ADD CONSTRAINT transfer_routes_transport_type_check
  CHECK (transport_type IN ('boat', 'car'));
