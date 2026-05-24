<?php

declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido.']);
    exit;
}

$configPath = __DIR__ . '/config.php';
$configExists = is_file($configPath);
$dbOk = false;

if ($configExists) {
    require __DIR__ . '/lib/bootstrap.php';
    try {
        api_pdo()->query('SELECT 1');
        $dbOk = true;
    } catch (Throwable) {
        $dbOk = false;
    }
}

echo json_encode([
    'ok' => true,
    'data' => [
        'service' => 'factura-ruta-api',
        'config' => $configExists,
        'database' => $dbOk,
    ],
], JSON_UNESCAPED_UNICODE);
