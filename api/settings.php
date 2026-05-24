<?php

declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
api_send_cors();

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

api_require_auth();
$pdo = api_pdo();

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM app_settings WHERE id = 1 LIMIT 1');
    $row = $stmt->fetch() ?: null;
    api_ok(settings_from_row($row));
}

if ($method === 'PUT' || $method === 'POST') {
    api_require_method(['PUT', 'POST']);
    $payload = api_read_json();
    $row = settings_to_row($payload);

    $sql = 'INSERT INTO app_settings (
                id, company_name, company_tagline, company_subtitle, company_tax_id, company_address,
                company_phone, company_email, primary_color, accent_color, invoice_terms, item_footnote,
                logo, updated_at
            ) VALUES (
                :id, :company_name, :company_tagline, :company_subtitle, :company_tax_id, :company_address,
                :company_phone, :company_email, :primary_color, :accent_color, :invoice_terms, :item_footnote,
                :logo, :updated_at
            )
            ON DUPLICATE KEY UPDATE
                company_name = VALUES(company_name),
                company_tagline = VALUES(company_tagline),
                company_subtitle = VALUES(company_subtitle),
                company_tax_id = VALUES(company_tax_id),
                company_address = VALUES(company_address),
                company_phone = VALUES(company_phone),
                company_email = VALUES(company_email),
                primary_color = VALUES(primary_color),
                accent_color = VALUES(accent_color),
                invoice_terms = VALUES(invoice_terms),
                item_footnote = VALUES(item_footnote),
                logo = VALUES(logo),
                updated_at = VALUES(updated_at)';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($row);
    api_ok(settings_from_row($row));
}

api_error('Método no permitido.', 405);
