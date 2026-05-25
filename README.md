# Factura Ruta

App movil de facturacion para acarreos y logistica (**LUNA LOGISTIC SERVICES**).

La factura PDF usa una **plantilla fija** (no hay pantalla de formato ni colores editables).

## Como abrir en Cursor

1. Abre la carpeta **`factura-ruta-cursor-pack`** (no la carpeta padre).
2. Abre `index.html` para revisar la app.

## Como probarla

```powershell
cd "c:\Users\User\Documents\Codex\2026-05-17\dise-a-una-app-movil-independiente-2\factura-ruta-cursor-pack"
python -m http.server 8081
```

Abre **http://127.0.0.1:8081** y recarga con **Ctrl+Shift+R** si ves una version antigua.

## Pantallas

- **Factura** — crear factura y descargar PDF con plantilla fija
- **Historial** — facturas guardadas
- **Recuento** — totales diario, semanal, mensual, anual

## Plantilla PDF (fija en `app.js`)

- Empresa: LUNA LOGISTIC SERVICES
- Eslogan, colores, terminos y diseno segun plantilla oficial
- Solo cambian los datos de cada factura (cliente, ruta, conceptos, etc.)

Para cambiar textos de empresa en el futuro, edita `INVOICE_TEMPLATE` en `app.js`.

## Archivos principales

- `index.html` — interfaz (3 pestañas, sin Formato)
- `app.js` — logica y generacion PDF
- `styles.css` — estilos de la app y vista previa
- `manifest.webmanifest` / `sw.js` — PWA
