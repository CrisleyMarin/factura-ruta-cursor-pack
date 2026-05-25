/**
 * Configuración del backend (PHP + MySQL).
 * Copia config.sample.php → api/config.php en el servidor.
 */
window.FACTURA_RUTA_API = {
  // true = guardar en MySQL vía API; false = solo localStorage
  enabled: false,
  // Ruta base de la API (misma carpeta del sitio si subes todo junto)
  baseUrl: "/api",
  // Debe coincidir con api_key en api/config.php
  apiKey: ""
};
