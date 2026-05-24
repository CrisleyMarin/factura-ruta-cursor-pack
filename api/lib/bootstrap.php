<?php

declare(strict_types=1);

function api_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $path = dirname(__DIR__) . '/config.php';
    if (!is_file($path)) {
        api_error('Falta api/config.php. Copia config.sample.php como config.php.', 500);
    }

    $config = require $path;
    return $config;
}

function api_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = api_config();
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['db_host'],
        $config['db_name'],
        $config['db_charset'] ?? 'utf8mb4'
    );

    try {
        $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (PDOException $exception) {
        api_error('No se pudo conectar a MySQL.', 500, ['detail' => $exception->getMessage()]);
    }

    return $pdo;
}

function api_send_cors(): void
{
    $config = api_config();
    $origins = $config['cors_origins'] ?? ['*'];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array('*', $origins, true)) {
        header('Access-Control-Allow-Origin: *');
    } elseif ($origin && in_array($origin, $origins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
    header('Content-Type: application/json; charset=utf-8');
}

function api_require_method(array $allowed): void
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    if (!in_array($method, $allowed, true)) {
        api_error('Método no permitido.', 405);
    }
}

function api_require_auth(): void
{
    $config = api_config();
    $expected = (string) ($config['api_key'] ?? '');
    $provided = (string) ($_SERVER['HTTP_X_API_KEY'] ?? '');

    if ($expected === '' || !hash_equals($expected, $provided)) {
        api_error('No autorizado. Revisa X-API-Key.', 401);
    }
}

function api_read_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        api_error('JSON inválido.', 400);
    }

    return $data;
}

function api_ok(mixed $data = null, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function api_error(string $message, int $status = 400, array $extra = []): void
{
    http_response_code($status);
    echo json_encode(array_merge(['ok' => false, 'error' => $message], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

function api_init(array $methods): void
{
    api_send_cors();
    api_require_method($methods);
    api_require_auth();
}

function invoice_from_row(array $row): array
{
    return [
        'id' => $row['id'],
        'number' => $row['number'],
        'date' => $row['invoice_date'],
        'clientName' => $row['client_name'],
        'clientEmail' => $row['client_email'],
        'clientPhone' => $row['client_phone'],
        'origin' => $row['origin'],
        'destination' => $row['destination'],
        'serviceNotes' => $row['service_notes'] ?? '',
        'items' => json_decode($row['items'], true) ?: [],
        'taxRate' => (float) $row['tax_rate'],
        'subtotal' => (float) $row['subtotal'],
        'tax' => (float) $row['tax'],
        'total' => (float) $row['total'],
        'createdAt' => gmdate('c', strtotime($row['created_at'])),
        'updatedAt' => !empty($row['updated_at']) ? gmdate('c', strtotime($row['updated_at'])) : null,
    ];
}

function invoice_to_row(array $invoice): array
{
    if (empty($invoice['id']) || empty($invoice['number']) || empty($invoice['date']) || empty($invoice['clientName'])) {
        api_error('Factura incompleta: id, number, date y clientName son obligatorios.', 422);
    }

    $items = $invoice['items'] ?? [];
    if (!is_array($items) || count($items) === 0) {
        api_error('La factura debe incluir al menos un concepto.', 422);
    }

    $createdAt = !empty($invoice['createdAt']) ? date('Y-m-d H:i:s', strtotime($invoice['createdAt'])) : date('Y-m-d H:i:s');
    $updatedAt = !empty($invoice['updatedAt']) ? date('Y-m-d H:i:s', strtotime($invoice['updatedAt'])) : date('Y-m-d H:i:s');

    return [
        'id' => (string) $invoice['id'],
        'number' => (string) $invoice['number'],
        'invoice_date' => (string) $invoice['date'],
        'client_name' => (string) $invoice['clientName'],
        'client_email' => (string) ($invoice['clientEmail'] ?? ''),
        'client_phone' => (string) ($invoice['clientPhone'] ?? ''),
        'origin' => (string) ($invoice['origin'] ?? ''),
        'destination' => (string) ($invoice['destination'] ?? ''),
        'service_notes' => (string) ($invoice['serviceNotes'] ?? ''),
        'items' => json_encode($items, JSON_UNESCAPED_UNICODE),
        'tax_rate' => (float) ($invoice['taxRate'] ?? 0),
        'subtotal' => (float) ($invoice['subtotal'] ?? 0),
        'tax' => (float) ($invoice['tax'] ?? 0),
        'total' => (float) ($invoice['total'] ?? 0),
        'created_at' => $createdAt,
        'updated_at' => $updatedAt,
    ];
}

function settings_from_row(?array $row): array
{
    if (!$row) {
        return [
            'companyName' => 'LUNA LOGISTIC SERVICES',
            'companyTagline' => 'Traslados simples, en manos de expertos.',
            'companySubtitle' => 'Servicios Profesionales de Acarreo y Logistica - Panama',
            'companyTaxId' => '',
            'companyAddress' => 'Panama',
            'companyPhone' => '',
            'companyEmail' => '',
            'primaryColor' => '#172938',
            'accentColor' => '#28b8a5',
            'invoiceTerms' => 'Gracias por preferirnos. Pago contra entrega salvo acuerdo previo.',
            'itemFootnote' => 'Carga, traslado seguro y descarga en destino segun ruta especificada.',
            'logo' => '',
        ];
    }

    return [
        'companyName' => $row['company_name'],
        'companyTagline' => $row['company_tagline'] ?? '',
        'companySubtitle' => $row['company_subtitle'] ?? '',
        'companyTaxId' => $row['company_tax_id'],
        'companyAddress' => $row['company_address'],
        'companyPhone' => $row['company_phone'],
        'companyEmail' => $row['company_email'],
        'primaryColor' => $row['primary_color'],
        'accentColor' => $row['accent_color'],
        'invoiceTerms' => $row['invoice_terms'] ?? '',
        'itemFootnote' => $row['item_footnote'] ?? '',
        'logo' => $row['logo'] ?? '',
    ];
}

function settings_to_row(array $settings): array
{
    return [
        'id' => 1,
        'company_name' => (string) ($settings['companyName'] ?? 'LUNA LOGISTIC SERVICES'),
        'company_tagline' => (string) ($settings['companyTagline'] ?? ''),
        'company_subtitle' => (string) ($settings['companySubtitle'] ?? ''),
        'company_tax_id' => (string) ($settings['companyTaxId'] ?? ''),
        'company_address' => (string) ($settings['companyAddress'] ?? ''),
        'company_phone' => (string) ($settings['companyPhone'] ?? ''),
        'company_email' => (string) ($settings['companyEmail'] ?? ''),
        'primary_color' => (string) ($settings['primaryColor'] ?? '#12343b'),
        'accent_color' => (string) ($settings['accentColor'] ?? '#f5a623'),
        'invoice_terms' => (string) ($settings['invoiceTerms'] ?? ''),
        'item_footnote' => (string) ($settings['itemFootnote'] ?? ''),
        'logo' => (string) ($settings['logo'] ?? ''),
        'updated_at' => date('Y-m-d H:i:s'),
    ];
}
