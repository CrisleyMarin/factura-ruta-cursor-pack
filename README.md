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

### Despliegue en Vercel

Este proyecto debe desplegarse como `factura-ruta-cursor-pack` para que use la URL:

`https://factura-ruta-cursor-pack.vercel.app`

El archivo `vercel.json` ya está configurado con ese nombre de proyecto.

Si tu carpeta local aún está vinculada a un proyecto antiguo, elimina `.vercel/project.json` o la carpeta `.vercel` y vuelve a linkear con el CLI de Vercel:

```powershell
npm install -g vercel
cd "c:\Users\User\Documents\Codex\2026-05-17\dise-a-una-app-movil-independiente-2\factura-ruta-cursor-pack"
Remove-Item -Recurse -Force .vercel
vercel link
vercel --prod
```

Si prefieres usar el dashboard, crea un nuevo proyecto llamado `factura-ruta-cursor-pack` y despliega el repositorio.

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
