-- cabin_availability bruges nu til at gemme BLOKEREDE datoer (ikke ledige).
-- Ryd alle eksisterende rækker (gammel semantik: is_available=true = ledig dato).
DELETE FROM cabin_availability;
