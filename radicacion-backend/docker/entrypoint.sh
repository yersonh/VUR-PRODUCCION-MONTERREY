#!/bin/sh
set -e

echo "==> Preparando Laravel para producción..."

# El Volume de Railway monta sobre /app/storage — recrear subdirectorios necesarios
mkdir -p /app/storage/app/public \
         /app/storage/app/private \
         /app/storage/framework/cache \
         /app/storage/framework/sessions \
         /app/storage/framework/views \
         /app/storage/logs
chown -R www-data:www-data /app/storage
chmod -R 775 /app/storage

# Optimizar Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Ejecutar migraciones automáticamente en cada deploy
echo "==> Ejecutando migraciones..."
php artisan migrate --force

echo "==> Ejecutando seeders..."
php artisan db:seed --force

echo "==> Listo. Iniciando servicios..."
exec "$@"
