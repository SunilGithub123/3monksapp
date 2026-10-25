# 3Monks — AWS Lightsail Deployment Guide

## Overview

Deploy the 3Monks juice bar app on a single AWS Lightsail instance using Docker Compose.

**Architecture:**
```
Internet → Lightsail Instance (port 80)
              ├── Nginx (frontend + reverse proxy)
              ├── Spring Boot (backend API)
              └── PostgreSQL 15 (database)
```

**Cost:** ~$10/month (2 GB RAM / 1 vCPU instance)

---

## Step 1 — Create a Lightsail Instance

1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com)
2. Click **Create instance**
3. Settings:
   - **Region:** Mumbai (ap-south-1) or closest to your users
   - **Platform:** Linux/Unix
   - **Blueprint:** OS Only → **Ubuntu 22.04 LTS**
   - **Instance plan:** **$10/month** (2 GB RAM, 1 vCPU, 60 GB SSD)
   - **Instance name:** `threemonks`
4. Click **Create instance**

## Step 2 — Configure Networking

1. Go to **Networking** tab of your instance
2. Add firewall rules:
   | Application | Protocol | Port |
   |-------------|----------|------|
   | HTTP        | TCP      | 80   |
   | SSH         | TCP      | 22   |
3. Note your **Public IP address** (e.g., `13.232.xxx.xxx`)
4. *(Optional)* Attach a **Static IP** so the IP doesn't change on reboot

## Step 3 — SSH into the Instance

**Option A — Browser SSH:**
Click the terminal icon on the Lightsail instance page.

**Option B — Terminal SSH:**
Download the SSH key from Lightsail → Account → SSH Keys.
```bash
chmod 400 ~/Downloads/LightsailDefaultKey-ap-south-1.pem
ssh -i ~/Downloads/LightsailDefaultKey-ap-south-1.pem ubuntu@YOUR_LIGHTSAIL_IP
```

## Step 4 — Run the Setup Script

From your **local machine**, copy the project to the server:
```bash
# From the project root directory
scp -i ~/Downloads/LightsailDefaultKey-ap-south-1.pem -r \
  backend frontend docker-compose.prod.yml deploy.sh .env.example \
  ubuntu@YOUR_LIGHTSAIL_IP:/home/ubuntu/threemonks/
```

Then **SSH into the instance** and run the setup:
```bash
ssh -i ~/Downloads/LightsailDefaultKey-ap-south-1.pem ubuntu@YOUR_LIGHTSAIL_IP

cd /home/ubuntu/threemonks
chmod +x deploy.sh
sudo ./deploy.sh
```

This installs Docker, Docker Compose, and generates secure `.env` credentials.

## Step 5 — Deploy the Application

```bash
# Move files to /opt/threemonks (where deploy.sh created .env)
sudo cp -r backend frontend docker-compose.prod.yml /opt/threemonks/
cd /opt/threemonks

# Build and start all containers
sudo docker compose -f docker-compose.prod.yml up -d --build
```

First build takes ~3-5 minutes. Check progress:
```bash
sudo docker compose -f docker-compose.prod.yml logs -f
```

Wait until you see:
```
Started ThreeMonksApplication in X seconds
Seeded 10 raw materials
Seeded recipes for all products
```

## Step 6 — Verify

Open in your browser:
```
http://YOUR_LIGHTSAIL_IP
```

Login with:
- **Username:** `admin`
- **Password:** `admin123`

> **Important:** Change the admin password after first login!

---

## Common Operations

### View logs
```bash
cd /opt/threemonks
sudo docker compose -f docker-compose.prod.yml logs -f backend
```

### Restart after code changes
```bash
cd /opt/threemonks
sudo docker compose -f docker-compose.prod.yml up -d --build
```

### Stop the application
```bash
sudo docker compose -f docker-compose.prod.yml down
```

### Reset database (loses all data)
```bash
sudo docker compose -f docker-compose.prod.yml down -v
sudo docker compose -f docker-compose.prod.yml up -d --build
```

### Check container status
```bash
sudo docker compose -f docker-compose.prod.yml ps
```

### Database backup
```bash
sudo docker exec threemonks-db pg_dump -U postgres threemonks > backup_$(date +%Y%m%d).sql
```

### Database restore
```bash
cat backup.sql | sudo docker exec -i threemonks-db psql -U postgres threemonks
```

---

## Optional — Custom Domain & SSL

### Attach a domain
1. In Lightsail, create a **Static IP** and attach it to your instance
2. In your domain registrar, add an A record pointing to the Static IP
3. Update the `CORS_ORIGINS` in `/opt/threemonks/.env`:
   ```
   CORS_ORIGINS=http://yourdomain.com,https://yourdomain.com
   ```

### Add HTTPS with Let's Encrypt (free SSL)

SSH into the instance and run:
```bash
# Install Certbot
sudo apt-get install -y certbot

# Get certificate (stop nginx first)
sudo docker compose -f docker-compose.prod.yml stop frontend
sudo certbot certonly --standalone -d yourdomain.com

# Certificates saved to /etc/letsencrypt/live/yourdomain.com/
```

Then update `docker-compose.prod.yml` frontend service:
```yaml
frontend:
  # ...existing config
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

And update `frontend/nginx.prod.conf` to add an HTTPS server block:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # ... same location blocks as port 80 ...
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

Rebuild: `sudo docker compose -f docker-compose.prod.yml up -d --build`

### Auto-renew SSL
```bash
echo "0 3 * * * certbot renew --quiet && docker restart threemonks-frontend" | sudo crontab -
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Page loads but API fails | Check `CORS_ORIGINS` in `.env` matches your URL |
| Container won't start | Check logs: `docker compose -f docker-compose.prod.yml logs backend` |
| Out of memory | Upgrade to $20/month plan (4 GB), or add swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |
| Database connection refused | Ensure postgres container is healthy: `docker compose -f docker-compose.prod.yml ps` |
| Build fails on ARM instance | Lightsail uses x86 — builds should work. If issues, check Docker buildx. |

---

## File Structure (Production)

```
/opt/threemonks/
├── .env                        # Secrets (auto-generated by deploy.sh)
├── docker-compose.prod.yml     # Production compose
├── backend/
│   ├── Dockerfile.prod         # No corporate proxy cert
│   ├── pom.xml
│   └── src/
└── frontend/
    ├── Dockerfile.prod         # Empty REACT_APP_API_URL
    ├── nginx.prod.conf         # Security headers, caching, proxy
    └── src/
```
