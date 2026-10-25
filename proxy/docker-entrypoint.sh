#!/bin/sh
# ==========================================================
# 3Monks Proxy — Entrypoint
# ==========================================================
# Generates self-signed SSL certificates as a fallback when
# Let's Encrypt certificates don't exist yet. This allows
# nginx to start immediately. Certbot will later replace
# these with real certificates.
# ==========================================================

set -e

DOMAIN="3monks.co.in"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
CERT_FILE="$CERT_DIR/fullchain.pem"
KEY_FILE="$CERT_DIR/privkey.pem"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "=== SSL certificates not found. Generating self-signed fallback certs ==="
    mkdir -p "$CERT_DIR"
    apk add --no-cache openssl > /dev/null 2>&1 || true
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/CN=$DOMAIN" \
        > /dev/null 2>&1
    echo "=== Self-signed certificates generated. Replace with Let's Encrypt certs via init-ssl.sh ==="
else
    echo "=== SSL certificates found. Starting nginx ==="
fi

exec "$@"
