-- Factura Ruta — MySQL 8+ / MariaDB 10.4+
-- Crear base de datos (ajusta el nombre si quieres):
-- CREATE DATABASE factura_ruta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE factura_ruta;

CREATE TABLE IF NOT EXISTS invoices (
  id CHAR(36) NOT NULL PRIMARY KEY,
  number VARCHAR(64) NOT NULL,
  invoice_date DATE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL DEFAULT '',
  client_phone VARCHAR(64) NOT NULL DEFAULT '',
  origin VARCHAR(255) NOT NULL DEFAULT '',
  destination VARCHAR(255) NOT NULL DEFAULT '',
  service_notes TEXT,
  items JSON NOT NULL,
  tax_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NULL,
  INDEX idx_invoice_date (invoice_date),
  INDEX idx_client_name (client_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  company_name VARCHAR(255) NOT NULL,
  company_tagline VARCHAR(255) NOT NULL DEFAULT '',
  company_subtitle VARCHAR(255) NOT NULL DEFAULT '',
  company_tax_id VARCHAR(64) NOT NULL DEFAULT '',
  company_address VARCHAR(255) NOT NULL DEFAULT '',
  company_phone VARCHAR(64) NOT NULL DEFAULT '',
  company_email VARCHAR(255) NOT NULL DEFAULT '',
  primary_color CHAR(7) NOT NULL DEFAULT '#12343b',
  accent_color CHAR(7) NOT NULL DEFAULT '#f5a623',
  invoice_terms TEXT,
  item_footnote TEXT,
  logo LONGTEXT,
  updated_at DATETIME(3) NULL,
  CONSTRAINT chk_single_settings CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO app_settings (
  id,
  company_name,
  company_tagline,
  company_subtitle,
  company_tax_id,
  company_address,
  company_phone,
  company_email,
  primary_color,
  accent_color,
  invoice_terms,
  item_footnote,
  logo
) VALUES (
  1,
  'LUNA LOGISTIC SERVICES',
  'Traslados simples, en manos de expertos.',
  'Servicios Profesionales de Acarreo y Logistica - Panama',
  '',
  'Panama',
  '',
  '',
  '#172938',
  '#28b8a5',
  'Gracias por preferirnos. Pago contra entrega salvo acuerdo previo.',
  'Carga, traslado seguro y descarga en destino segun ruta especificada.',
  ''
) ON DUPLICATE KEY UPDATE id = id;
