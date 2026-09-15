"""
API de Factura Ruta en Python (Flask) — equivalente a la carpeta api/ en PHP.

Instalar dependencias:
    pip install -r requirements.txt

Configurar:
    cp config.sample.py config.py
    # edita config.py con tus datos de MySQL y tu api_key

Ejecutar en desarrollo:
    python app.py
"""

from flask import Flask, request

from lib import (
    ApiError,
    api_config,
    api_error_response,
    api_ok,
    api_pdo,
    api_read_json,
    api_require_auth,
    api_require_method,
    api_send_cors_headers,
    close_db,
    config_exists,
    invoice_from_row,
    invoice_to_row,
    settings_from_row,
    settings_to_row,
)

app = Flask(__name__)


@app.teardown_appcontext
def _teardown(exc):
    close_db(exc)


@app.errorhandler(ApiError)
def _handle_api_error(err: ApiError):
    response = api_error_response(err.message, err.status, err.extra)
    return api_send_cors_headers(response)


@app.after_request
def _cors(response):
    return api_send_cors_headers(response)


@app.route("/api/health.php", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return "", 204
    if request.method != "GET":
        return api_error_response("Método no permitido.", 405)

    db_ok = False
    exists = config_exists()
    if exists:
        try:
            with api_pdo().cursor() as cursor:
                cursor.execute("SELECT 1")
            db_ok = True
        except Exception:
            db_ok = False

    return api_ok({"service": "factura-ruta-api", "config": exists, "database": db_ok})


@app.route("/api/invoices.php", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
def invoices():
    if request.method == "OPTIONS":
        return "", 204

    api_require_auth()
    pdo = api_pdo()

    if request.method == "GET":
        with pdo.cursor() as cursor:
            cursor.execute(
                """SELECT id, number, invoice_date, client_name, client_email, client_phone,
                          origin, destination, service_notes, items, tax_rate, subtotal, tax, total,
                          created_at, updated_at
                   FROM invoices
                   ORDER BY created_at DESC"""
            )
            rows = cursor.fetchall()
        return api_ok([invoice_from_row(row) for row in rows])

    if request.method in ("POST", "PUT"):
        api_require_method(["POST", "PUT"])
        invoice = api_read_json()
        row = invoice_to_row(invoice)

        sql = """INSERT INTO invoices (
                    id, number, invoice_date, client_name, client_email, client_phone,
                    origin, destination, service_notes, items, tax_rate, subtotal, tax, total,
                    created_at, updated_at
                  ) VALUES (
                    %(id)s, %(number)s, %(invoice_date)s, %(client_name)s, %(client_email)s, %(client_phone)s,
                    %(origin)s, %(destination)s, %(service_notes)s, %(items)s, %(tax_rate)s, %(subtotal)s, %(tax)s, %(total)s,
                    %(created_at)s, %(updated_at)s
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
                    updated_at = VALUES(updated_at)"""

        with pdo.cursor() as cursor:
            cursor.execute(sql, row)
            cursor.execute(
                """SELECT id, number, invoice_date, client_name, client_email, client_phone,
                          origin, destination, service_notes, items, tax_rate, subtotal, tax, total,
                          created_at, updated_at
                   FROM invoices WHERE id = %(id)s LIMIT 1""",
                {"id": row["id"]},
            )
            saved = cursor.fetchone()

        return api_ok(invoice_from_row(saved or row))

    if request.method == "DELETE":
        api_require_method(["DELETE"])
        invoice_id = request.args.get("id", "")
        if invoice_id == "":
            raise ApiError("Falta el parámetro id.", 422)

        with pdo.cursor() as cursor:
            affected = cursor.execute("DELETE FROM invoices WHERE id = %(id)s", {"id": invoice_id})

        return api_ok({"deleted": affected > 0, "id": invoice_id})

    raise ApiError("Método no permitido.", 405)


@app.route("/api/settings.php", methods=["GET", "POST", "PUT", "OPTIONS"])
def settings():
    if request.method == "OPTIONS":
        return "", 204

    api_require_auth()
    pdo = api_pdo()

    if request.method == "GET":
        with pdo.cursor() as cursor:
            cursor.execute("SELECT * FROM app_settings WHERE id = 1 LIMIT 1")
            row = cursor.fetchone()
        return api_ok(settings_from_row(row))

    if request.method in ("PUT", "POST"):
        api_require_method(["PUT", "POST"])
        payload = api_read_json()
        row = settings_to_row(payload)

        sql = """INSERT INTO app_settings (
                    id, company_name, company_tagline, company_subtitle, company_tax_id, company_address,
                    company_phone, company_email, primary_color, accent_color, invoice_terms, item_footnote,
                    logo, updated_at
                  ) VALUES (
                    %(id)s, %(company_name)s, %(company_tagline)s, %(company_subtitle)s, %(company_tax_id)s, %(company_address)s,
                    %(company_phone)s, %(company_email)s, %(primary_color)s, %(accent_color)s, %(invoice_terms)s, %(item_footnote)s,
                    %(logo)s, %(updated_at)s
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
                    updated_at = VALUES(updated_at)"""

        with pdo.cursor() as cursor:
            cursor.execute(sql, row)

        return api_ok(settings_from_row(row))

    raise ApiError("Método no permitido.", 405)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8082, debug=True)
