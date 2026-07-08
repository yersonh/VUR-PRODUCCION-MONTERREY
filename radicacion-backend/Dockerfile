FROM php:8.4-fpm-alpine

# ── Dependencias del sistema ───────────────────────────────────────
RUN apk add --no-cache \
    nginx \
    supervisor \
    libpq-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl \
    oniguruma-dev \
    libxml2-dev \
    icu-dev \
    autoconf \
    g++ \
    make

# ── Extensiones PHP ────────────────────────────────────────────────
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    pgsql \
    mbstring \
    xml \
    bcmath \
    opcache \
    pcntl \
    zip \
    intl

RUN pecl install redis && docker-php-ext-enable redis

# ── Composer ───────────────────────────────────────────────────────
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# ── OPcache ────────────────────────────────────────────────────────
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/opcache.ini \
 && echo "opcache.memory_consumption=128" >> /usr/local/etc/php/conf.d/opcache.ini \
 && echo "opcache.max_accelerated_files=10000" >> /usr/local/etc/php/conf.d/opcache.ini \
 && echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/opcache.ini

# ── Código de la aplicación ────────────────────────────────────────
WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

COPY . .

RUN composer run-script post-autoload-dump --no-interaction || true

# ── Permisos ───────────────────────────────────────────────────────
RUN mkdir -p /app/storage/app/public \
             /app/storage/app/private \
             /app/storage/framework/cache \
             /app/storage/framework/sessions \
             /app/storage/framework/views \
             /app/storage/logs \
             /app/bootstrap/cache \
 && chown -R www-data:www-data /app/storage /app/bootstrap/cache \
 && chmod -R 775 /app/storage /app/bootstrap/cache

# ── Configs de nginx y supervisor ─────────────────────────────────
COPY docker/nginx.conf      /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/entrypoint.sh   /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
