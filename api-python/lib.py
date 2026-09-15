"""Equivalente en Python de api/lib/bootstrap.php."""

import hmac
import importlib.util
import json
from datetime import date, datetime
from pathlib import Path

import pymysql
import pymysql.cursors
from flask import Response, g, request

CONFIG_PATH = Path(__file__).with_name("config.py")


class ApiError(Exception):
    def __init__(self, message, status=400, extra=None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.extra = extra or {}


def config_exists() -> bool:
    return CONFIG_PATH.is_file()


def api_config() -> dict:
    if not config_exists():
        raise ApiError("Falta api-python/config.py. Copia config.sample.py como config.py.", 500)

    spec = importlib.util.spec_from_file_location("factura_ruta_config", CONFIG_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.CONFIG


def api_pdo():
    """Devuelve una conexión MySQL cacheada durante la petición actual."""
    if "db" not in g:
        config = api_config()
        try:
            g.db = pymysql.connect(
                host=config["db_host"],
                db=config["db_name"],
                user=config["db_user"],
                password=config["db_pass"],
                charset=config.get("db_charset", "utf8mb4"),
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=True,
            )
        except pymysql.MySQLError as exc:
            raise ApiError("No se pudo conectar a MySQL.", 500, {"detail": str(exc)}) from exc
    return g.db


def close_db(_exc=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def api_send_cors_headers(response: Response) -> Response:
    try:
        config = api_config()
        origins = config.get("cors_origins") or ["*"]
    except ApiError:
        origins = ["*"]
    origin = request.headers.get("Origin", "")

    if "*" in origins:
        response.headers["Access-Control-Allow-Origin"] = "*"
    elif origin and origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"

    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-API-Key"
    return response


def api_require_method(allowed):
    if request.method not in allowed:
        raise ApiError("Método no permitido.", 405)


def api_require_auth():
    config = api_config()
    expected = str(config.get("api_key") or "")
    provided = request.headers.get("X-API-Key", "")

    if expected == "" or not hmac.compare_digest(expected, provided):
        raise ApiError("No autorizado. Revisa X-API-Key.", 401)


def api_read_json() -> dict:
    raw = request.get_data(cache=False, as_text=True)
    if raw is None or raw.strip() == "":
        return {}

    try:
        data = json.loads(raw)
    except ValueError:
        raise ApiError("JSON inválido.", 400)

    if not isinstance(data, dict):
        raise ApiError("JSON inválido.", 400)

    return data


def api_ok(data=None, status: int = 200) -> Response:
    body = json.dumps({"ok": True, "data": data}, ensure_ascii=False)
    response = Response(body, status=status, mimetype="application/json")
    response.headers["Content-Type"] = "application/json; charset=utf-8"
    return response


def api_error_response(message: str, status: int = 400, extra=None) -> Response:
    payload = {"ok": False, "error": message}
    payload.update(extra or {})
    body = json.dumps(payload, ensure_ascii=False)
    response = Response(body, status=status, mimetype="application/json")
    response.headers["Content-Type"] = "application/json; charset=utf-8"
    return response


def _to_str(value) -> str:
    if value is None:
        return ""
    return str(value)


def _parse_datetime(value, fallback: datetime) -> datetime:
    if not value:
        return fallback
    text = str(value).strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return fallback


def _format_iso_utc(value) -> str:
    """Replica gmdate('c', strtotime($value)) para columnas DATETIME."""
    if value is None:
        return None
    if isinstance(value, str):
        value = _parse_datetime(value, datetime.utcnow())
    return value.strftime("%Y-%m-%dT%H:%M:%S+00:00")


def invoice_from_row(row: dict) -> dict:
    items = row.get("items")
    if isinstance(items, (bytes, str)):
        try:
            items = json.loads(items) or []
        except ValueError:
            items = []
    elif items is None:
        items = []

    invoice_date = row.get("invoice_date")
    if isinstance(invoice_date, date):
        invoice_date = invoice_date.isoformat()

    updated_at = row.get("updated_at")

    return {
        "id": row["id"],
        "number": row["number"],
        "date": invoice_date,
        "clientName": row["client_name"],
        "clientEmail": row["client_email"],
        "clientPhone": row["client_phone"],
        "origin": row["origin"],
        "destination": row["destination"],
        "serviceNotes": row.get("service_notes") or "",
        "items": items,
        "taxRate": float(row["tax_rate"]) if row["tax_rate"] is not None else 0.0,
        "subtotal": float(row["subtotal"]) if row["subtotal"] is not None else 0.0,
        "tax": float(row["tax"]) if row["tax"] is not None else 0.0,
        "total": float(row["total"]) if row["total"] is not None else 0.0,
        "createdAt": _format_iso_utc(row["created_at"]),
        "updatedAt": _format_iso_utc(updated_at) if updated_at else None,
    }


def invoice_to_row(invoice: dict) -> dict:
    if not invoice.get("id") or not invoice.get("number") or not invoice.get("date") or not invoice.get("clientName"):
        raise ApiError("Factura incompleta: id, number, date y clientName son obligatorios.", 422)

    items = invoice.get("items") or []
    if not isinstance(items, list) or len(items) == 0:
        raise ApiError("La factura debe incluir al menos un concepto.", 422)

    now = datetime.utcnow()
    created_at = _parse_datetime(invoice.get("createdAt"), now)
    updated_at = _parse_datetime(invoice.get("updatedAt"), now)

    return {
        "id": _to_str(invoice["id"]),
        "number": _to_str(invoice["number"]),
        "invoice_date": _to_str(invoice["date"]),
        "client_name": _to_str(invoice["clientName"]),
        "client_email": _to_str(invoice.get("clientEmail", "")),
        "client_phone": _to_str(invoice.get("clientPhone", "")),
        "origin": _to_str(invoice.get("origin", "")),
        "destination": _to_str(invoice.get("destination", "")),
        "service_notes": _to_str(invoice.get("serviceNotes", "")),
        "items": json.dumps(items, ensure_ascii=False),
        "tax_rate": float(invoice.get("taxRate") or 0),
        "subtotal": float(invoice.get("subtotal") or 0),
        "tax": float(invoice.get("tax") or 0),
        "total": float(invoice.get("total") or 0),
        "created_at": created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "updated_at": updated_at.strftime("%Y-%m-%d %H:%M:%S"),
    }


DEFAULT_SETTINGS = {
    "companyName": "LUNA INVOICE",
    "companyTagline": "Traslados simples, en manos de expertos.",
    "companySubtitle": "Servicios Profesionales de Acarreo y Logistica - Panama",
    "companyTaxId": "",
    "companyAddress": "Panama",
    "companyPhone": "",
    "companyEmail": "",
    "primaryColor": "#172938",
    "accentColor": "#28b8a5",
    "invoiceTerms": "Gracias por preferirnos. Pago contra entrega salvo acuerdo previo.",
    "itemFootnote": "Carga, traslado seguro y descarga en destino segun ruta especificada.",
    "logo": "",
}


def settings_from_row(row) -> dict:
    if not row:
        return dict(DEFAULT_SETTINGS)

    return {
        "companyName": row["company_name"],
        "companyTagline": row.get("company_tagline") or "",
        "companySubtitle": row.get("company_subtitle") or "",
        "companyTaxId": row["company_tax_id"],
        "companyAddress": row["company_address"],
        "companyPhone": row["company_phone"],
        "companyEmail": row["company_email"],
        "primaryColor": row["primary_color"],
        "accentColor": row["accent_color"],
        "invoiceTerms": row.get("invoice_terms") or "",
        "itemFootnote": row.get("item_footnote") or "",
        "logo": row.get("logo") or "",
    }


def settings_to_row(settings: dict) -> dict:
    return {
        "id": 1,
        "company_name": _to_str(settings.get("companyName") or "LUNA INVOICE"),
        "company_tagline": _to_str(settings.get("companyTagline", "")),
        "company_subtitle": _to_str(settings.get("companySubtitle", "")),
        "company_tax_id": _to_str(settings.get("companyTaxId", "")),
        "company_address": _to_str(settings.get("companyAddress", "")),
        "company_phone": _to_str(settings.get("companyPhone", "")),
        "company_email": _to_str(settings.get("companyEmail", "")),
        "primary_color": _to_str(settings.get("primaryColor") or "#12343b"),
        "accent_color": _to_str(settings.get("accentColor") or "#f5a623"),
        "invoice_terms": _to_str(settings.get("invoiceTerms", "")),
        "item_footnote": _to_str(settings.get("itemFootnote", "")),
        "logo": _to_str(settings.get("logo", "")),
        "updated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
    }
