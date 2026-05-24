<?php
/**
 * Copia este archivo como config.php y completa tus datos.
 * No subas config.php a repositorios públicos.
 */
return [
    'db_host' => 'localhost',
    'db_name' => 'factura_ruta',
    'db_user' => 'tu_usuario_mysql',
    'db_pass' => 'tu_contraseña_mysql',
    'db_charset' => 'utf8mb4',
    // Clave que debe enviar el frontend en el header X-API-Key
    'api_key' => 'cambia-esta-clave-por-una-larga-y-secreta',
    // Orígenes permitidos para CORS (tu dominio en producción)
    'cors_origins' => ['*'],
];
