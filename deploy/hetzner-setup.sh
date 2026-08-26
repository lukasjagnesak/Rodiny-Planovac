#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  Prvotní příprava čerstvého serveru na Hetzneru (Ubuntu 22.04/24.04)
#
#  Spusť jako root:
#    bash deploy/hetzner-setup.sh
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/dvojklic}"

log() { printf '\n\033[1;32m▶ %s\033[0m\n' "$1"; }

if [[ $EUID -ne 0 ]]; then
  echo "Spusť skript jako root (sudo bash deploy/hetzner-setup.sh)." >&2
  exit 1
fi

log "Aktualizace systému"
apt-get update -qq
apt-get upgrade -y -qq

log "Instalace Dockeru"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

log "Firewall — povolíme jen SSH a web"
apt-get install -y -qq ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

log "Automatické bezpečnostní aktualizace"
apt-get install -y -qq unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

log "Odkládací soubor (malé instance bez něj při buildu dojde paměť)"
if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

log "Adresář aplikace: $APP_DIR"
mkdir -p "$APP_DIR"

cat <<'EOF'

═══════════════════════════════════════════════════════════════════
 Server je připravený. Další kroky:

 1) Nahrej projekt na server, například:
      git clone <adresa-repozitáře> /opt/dvojklic
      cd /opt/dvojklic

 2) Vytvoř .env podle .env.example a doplň klíče:
      cp .env.example .env && nano .env

 3) Do .env přidej i doménu pro Caddy:
      APP_DOMAIN=dvojklic.cz

 4) Nasměruj A záznam domény na IP tohoto serveru.

 5) Spusť aplikaci:
      docker compose up -d --build

 HTTPS certifikát si Caddy vyžádá sám během pár vteřin.
═══════════════════════════════════════════════════════════════════

EOF
