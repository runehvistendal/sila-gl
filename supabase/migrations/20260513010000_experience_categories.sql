-- Kategorier gemmes som JSONB: [{ key: "kajak", description: "Vi padler ud til..." }, ...]
ALTER TABLE experiences
  ADD COLUMN categories JSONB NOT NULL DEFAULT '[]';

-- Fjern den gamle enkelt-kategori-kolonne
ALTER TABLE experiences
  DROP COLUMN category;
