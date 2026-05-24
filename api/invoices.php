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
    $stmt = $pdo->query(
        'SELECT id, number, invoice_date, client_name, client_email, client_phone,
                origin, destination, service_notes, items, tax_rate, subtotal, tax, total,
                created_at, updated_at
         FROM invoices
         ORDER BY created_at DESC'
    );
    $rows = $stmt->fetchAll();
    api_ok(array_map('invoice_from_row', $rows));
}

if ($method === 'POST' || $method === 'PUT') {
    api_require_method(['POST', 'PUT']);
    $invoice = api_read_json();
    $row = invoice_to_row($invoice);

    $sql = 'INSERT INTO invoices (
                id, number, invoice_date, client_name, client_email, client_phone,
                origin, destination, service_notes, items, tax_rate, subtotal, tax, total,
                created_at, updated_at
            ) VALUES (
                :id, :number, :invoice_date, :client_name, :client_email, :client_phone,
                :origin, :destination, :service_notes, :items, :tax_rate, :subtotal, :tax, :total,
                :created_at, :updated_at
            )
            ON DUPLICATE KEY UPDATE
                number = VALUES(number),
                invoice_date = VALUES(invoice_date),
                client_name = VALUES(client_name),
                client_email = VALUES(client_email),
                client_phone = VALUES(client_phone),
                origin = VALUES(origin),
                destination = VALUES(destination),
                service_notes = VALUES(service_notes),
                items = VALUES(items),
                tax_rate = VALUES(tax_rate),
                subtotal = VALUES(subtotal),
                tax = VALUES(tax),
                total = VALUES(total),
                updated_at = VALUES(updated_at)';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($row);

    $select = $pdo->prepare(
        'SELECT id, number, invoice_date, client_name, client_email, client_phone,
                origin, destination, service_notes, items, tax_rate, subtotal, tax, total,
                created_at, updated_at
         FROM invoices WHERE id = :id LIMIT 1'
    );
    $select->execute(['id' => $row['id']]);
    $saved = $select->fetch();
    api_ok(invoice_from_row($saved ?: $row));
}

if ($method === 'DELETE') {
    api_require_method(['DELETE']);
    $id = $_GET['id'] ?? '';
    if ($id === '') {
        api_error('Falta el parámetro id.', 422);
    }

    $stmt = $pdo->prepare('DELETE FROM invoices WHERE id = :id');
    $stmt->execute(['id' => $id]);
    api_ok(['deleted' => $stmt->rowCount() > 0, 'id' => $id]);
}

api_error('Método no permitido.', 405);
