#!/usr/bin/env bash
# ==========================================================
# 3Monks — AWS Lightsail Instance Setup Script
# ==========================================================
# Run this ON the Lightsail instance after SSH-ing in.
# Usage:
#   chmod +x deploy.sh && sudo ./deploy.sh
# ==========================================================

set -euo pipefail

echo "========================================="
echo " 3Monks — Lightsail Server Setup"
echo "========================================="

# ---- 1. System updates ----
echo "[1/5] Updating system packages..."
apt-get update -y && apt-get upgrade -y

# ---- 2. Install Docker ----
echo "[2/5] Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker installed: $(docker --version)"
else
    echo "Docker already installed: $(docker --version)"
fi

# ---- 3. Install Docker Compose plugin ----
echo "[3/5] Installing Docker Compose..."
if ! docker compose version &>/dev/null; then
    apt-get install -y docker-compose-plugin
    echo "Docker Compose installed: $(docker compose version)"
else
    echo "Docker Compose already installed: $(docker compose version)"
fi

# ---- 4. Create app directory ----
APP_DIR="/opt/threemonks"
echo "[4/5] Setting up app directory at $APP_DIR..."
mkdir -p "$APP_DIR"

# ---- 5. Generate .env if missing ----
if [ ! -f "$APP_DIR/.env" ]; then
    echo "[5/5] Generating .env with secure defaults..."
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
    PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || echo "YOUR_IP")

    cat > "$APP_DIR/.env" <<EOF
# 3Monks Production Config — Generated $(date)
DB_NAME=threemonks
DB_USERNAME=postgres
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGINS=https://3monks.co.in
SSL_EMAIL=admin@3monks.co.in
EOF
    echo "  .env created at $APP_DIR/.env"
    echo "  DB_PASSWORD and JWT_SECRET auto-generated"
    echo "  Public IP detected: $PUBLIC_IP"
else
    echo "[5/5] .env already exists at $APP_DIR/.env — skipping"
fi

echo ""
echo "========================================="
echo " Setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Copy your project files to $APP_DIR/"
echo "     From your local machine:"
echo "       scp -r -i ~/.ssh/your-key.pem ./* ubuntu@<IP>:$APP_DIR/"
echo ""
echo "  2. Point DNS records to this server:"
echo "       A record: 3monks.co.in     → <your-server-ip>"
echo "       A record: www.3monks.co.in → <your-server-ip>"
echo ""
echo "  3. Open ports 80 AND 443 in Lightsail Networking tab"
echo ""
echo "  4. SSH in and obtain SSL certificates (first time only):"
echo "       cd $APP_DIR"
echo "       sudo ./init-ssl.sh"
echo ""
echo "  5. Start the full stack with HTTPS:"
echo "       docker compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "  6. Visit: https://3monks.co.in"
echo "     Login: admin / admin123"
echo ""
