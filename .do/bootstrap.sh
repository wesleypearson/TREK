#!/usr/bin/env bash
# =============================================================================
#  TREK on DigitalOcean — manual bootstrap script
# -----------------------------------------------------------------------------
#  Use this when cloud-init wasn't pasted at Droplet creation. Run on the
#  Droplet as root (e.g. via the DigitalOcean web Console):
#
#    DOMAIN_NAME=trek.example.com \
#    LETSENCRYPT_EMAIL=you@example.com \
#    ADMIN_EMAIL=family@example.com \
#    TZ=UTC \
#    bash <(curl -fsSL https://raw.githubusercontent.com/wesleypearson/TREK/claude/setup-digitalocean-family-UBQnO/.do/bootstrap.sh)
#
#  Installs Docker + UFW, drops in TREK + Caddy via docker compose with a real
#  persistent disk at /opt/trek/{data,uploads}, configures auto Let's Encrypt
#  TLS (DNS must already resolve to this Droplet), and writes the generated
#  admin credentials to /root/trek-credentials.txt (mode 0600).
#
#  Safe to re-run: file writes overwrite, .env regenerates random secrets only
#  on first run (preserves ENCRYPTION_KEY + admin password on subsequent runs).
# =============================================================================
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "ERROR: run as root (sudo -i first)." >&2
  exit 1
fi

: "${DOMAIN_NAME:?Set DOMAIN_NAME=trek.example.com}"
: "${LETSENCRYPT_EMAIL:?Set LETSENCRYPT_EMAIL=you@example.com}"
: "${ADMIN_EMAIL:?Set ADMIN_EMAIL=family@example.com}"
: "${TZ:=UTC}"

echo "============================================================"
echo " TREK bootstrap starting"
echo "   Domain:    ${DOMAIN_NAME}"
echo "   LE email:  ${LETSENCRYPT_EMAIL}"
echo "   Admin:     ${ADMIN_EMAIL}"
echo "   Timezone:  ${TZ}"
echo "============================================================"

export DEBIAN_FRONTEND=noninteractive

echo "[1/6] disable unattended-upgrades (prevents apt-lock stall) + apt install"
# Ubuntu 24.04 auto-starts unattended-upgrades on first boot, holding the apt
# lock for 5–15 min. Disable it before any apt operation.
systemctl stop unattended-upgrades.service apt-daily.timer apt-daily-upgrade.timer apt-daily.service apt-daily-upgrade.service 2>/dev/null || true
systemctl mask unattended-upgrades.service apt-daily.timer apt-daily-upgrade.timer apt-daily.service apt-daily-upgrade.service 2>/dev/null || true
pkill -9 -f unattended-upgrade 2>/dev/null || true
rm -f /var/lib/apt/lists/lock /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock 2>/dev/null || true

apt-get update -y
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg ufw openssl \
  docker.io docker-compose-v2

mkdir -p /opt/trek/data /opt/trek/uploads

echo "[2/6] writing /opt/trek/docker-compose.yml"
cat > /opt/trek/docker-compose.yml <<'YAML'
services:
  app:
    image: mauriceboe/trek:latest
    container_name: trek
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETUID
      - SETGID
    tmpfs:
      - /tmp:noexec,nosuid,size=64m
    expose:
      - "3000"
    env_file: .env
    environment:
      - NODE_ENV=production
      - PORT=3000
      - FORCE_HTTPS=true
      - TRUST_PROXY=1
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  caddy:
    image: caddy:2-alpine
    container_name: caddy
    ports:
      - "80:80"
      - "443:443"
    env_file: .env
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    restart: unless-stopped
    depends_on:
      - app

volumes:
  caddy_data:
  caddy_config:
YAML

echo "[3/6] writing /opt/trek/Caddyfile"
cat > /opt/trek/Caddyfile <<'CADDY'
{$DOMAIN_NAME} {
    encode gzip zstd
    reverse_proxy app:3000
    tls {$LETSENCRYPT_EMAIL}
}
CADDY

echo "[4/6] writing /opt/trek/.env (preserving existing secrets if any)"
if [[ -f /opt/trek/.env ]]; then
  ENCRYPTION_KEY="$(grep '^ENCRYPTION_KEY=' /opt/trek/.env | cut -d= -f2-)"
  ADMIN_PASSWORD="$(grep '^ADMIN_PASSWORD=' /opt/trek/.env | cut -d= -f2-)"
fi
ENCRYPTION_KEY="${ENCRYPTION_KEY:-$(openssl rand -hex 32)}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(openssl rand -base64 18 | tr -d '=+/' | cut -c1-20)}"

cat > /opt/trek/.env <<EOF
DOMAIN_NAME=${DOMAIN_NAME}
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL}
TZ=${TZ}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
APP_URL=https://${DOMAIN_NAME}
ALLOWED_ORIGINS=https://${DOMAIN_NAME}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
EOF
chmod 600 /opt/trek/.env

cat > /root/trek-credentials.txt <<EOF
============================================================
 TREK is running at:
   https://${DOMAIN_NAME}

 First-boot admin login:
   Email:    ${ADMIN_EMAIL}
   Password: ${ADMIN_PASSWORD}

 Files on this Droplet:
   /root/trek-credentials.txt   (this file — keep private)
   /opt/trek/.env               (full config, including ENCRYPTION_KEY)
   /opt/trek/data/              (SQLite database — back this up)
   /opt/trek/uploads/           (user uploads — back this up)

 Common commands:
   systemctl status trek
   cd /opt/trek && docker compose logs -f
   cd /opt/trek && docker compose pull && docker compose up -d   # update
============================================================
EOF
chmod 600 /root/trek-credentials.txt

echo "[5/6] systemd unit + UFW firewall"
cat > /etc/systemd/system/trek.service <<'UNIT'
[Unit]
Description=TREK family travel planner
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=true
WorkingDirectory=/opt/trek
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
UNIT

ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

systemctl enable --now docker
systemctl daemon-reload
systemctl enable --now trek.service

echo "[6/6] waiting for containers to settle..."
sleep 5
cd /opt/trek && docker compose ps

echo ""
echo "============================================================"
echo " TREK bootstrap complete."
echo " URL:      https://${DOMAIN_NAME}"
echo " Admin:    ${ADMIN_EMAIL}"
echo " Password: see /root/trek-credentials.txt"
echo ""
echo " Caddy is now requesting a Let's Encrypt cert. DNS must"
echo " resolve trek.artgrp.au to THIS Droplet (not Cloudflare's"
echo " proxy) for the cert request to succeed. Watch progress:"
echo "   cd /opt/trek && docker compose logs -f caddy"
echo "============================================================"
