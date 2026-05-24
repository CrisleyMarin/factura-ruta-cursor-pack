-- Ejecutar si ya tenías la base creada antes de los campos del PDF
ALTER TABLE app_settings
  ADD COLUMN company_tagline VARCHAR(255) NOT NULL DEFAULT '' AFTER company_name,
  ADD COLUMN company_subtitle VARCHAR(255) NOT NULL DEFAULT '' AFTER company_tagline,
  ADD COLUMN item_footnote TEXT AFTER invoice_terms;
