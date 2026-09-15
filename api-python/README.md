# Factura Ruta API (Python / Flask)

Reescritura en Python de la carpeta `api/` (PHP). Expone las mismas rutas,
mismo contrato JSON (`{ ok, data }` / `{ ok, error }`) y misma autenticación
por header `X-API-Key`, para que el frontend (`app.js` / `api-client.js`)
funcione sin cambios.

## Instalar

```bash
cd api-python
python -m venv .venv
source .venv/bin/activate   # en Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Configurar

```bash
cp config.sample.py config.py
```

Edita `config.py` con tus datos de MySQL y una `api_key` segura. La base de
datos usa el mismo esquema que ya está en `database/schema.sql`.

## Ejecutar en desarrollo

```bash
python app.py
```

Por defecto levanta en `http://127.0.0.1:8082`.

## Endpoints

Se conservan los mismos nombres de archivo que la versión PHP para no tocar
`config.js` / `api-client.js`:

- `GET  /api/health.php`
- `GET  /api/invoices.php`
- `POST/PUT /api/invoices.php`
- `DELETE /api/invoices.php?id=...`
- `GET  /api/settings.php`
- `POST/PUT /api/settings.php`

Si sirves esta API en una ruta base distinta a `/api`, ajusta
`window.FACTURA_RUTA_API.baseUrl` en `config.js`.

## Producción

Usa un servidor WSGI real, por ejemplo Gunicorn:

```bash
pip install gunicorn
gunicorn -w 2 -b 0.0.0.0:8082 app:app
```

y ponlo detrás de un proxy (Nginx, Apache, etc.) que exponga la ruta `/api`.
