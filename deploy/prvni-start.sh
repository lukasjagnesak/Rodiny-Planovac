#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  První spuštění na serveru.
#
#  Zkontroluje .env dřív, než se pustí několikaminutový build —
#  zapomenutý klíč se jinak projeví až tím, že aplikace naběhne
#  a nikdo se nepřihlásí.
#
#    bash deploy/prvni-start.sh
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

cd "$(dirname "$0")/.."

zeleny() { printf '\033[1;32m%s\033[0m\n' "$1"; }
cerveny() { printf '\033[1;31m%s\033[0m\n' "$1"; }
log() { printf '\n\033[1;32m▶ %s\033[0m\n' "$1"; }

if [[ ! -f .env ]]; then
  cerveny "Chybí .env. Vytvoř ho:  cp .env.example .env && nano .env"
  exit 1
fi

# ── Kontrola proměnných ───────────────────────────────────────────
log "Kontroluji .env"

set -a; source ./.env; set +a

chyby=0
vyzaduj() {
  local jmeno="$1" popis="$2"
  local hodnota="${!jmeno:-}"

  if [[ -z "$hodnota" ]]; then
    cerveny "  ✗ $jmeno chybí — $popis"
    chyby=$((chyby + 1))
  elif [[ "$hodnota" == *"xxxx"* || "$hodnota" == "eyJhbGciOi..." || "$hodnota" == *"tvoje-domena"* ]]; then
    cerveny "  ✗ $jmeno je pořád ukázková hodnota — $popis"
    chyby=$((chyby + 1))
  else
    echo "  ✓ $jmeno"
  fi
}

vyzaduj NEXT_PUBLIC_SITE_URL     "ostrá adresa aplikace, https://…"
vyzaduj APP_DOMAIN               "doména pro certifikát, bez https://"
vyzaduj NEXT_PUBLIC_SUPABASE_URL "Supabase → Project Settings → API"
vyzaduj NEXT_PUBLIC_SUPABASE_ANON_KEY "tamtéž, anon public"
vyzaduj SUPABASE_SERVICE_ROLE_KEY "tamtéž, service_role"
vyzaduj TOKEN_ENCRYPTION_KEY     "openssl rand -base64 32 — stejný jako lokálně!"
vyzaduj CRON_SECRET              "openssl rand -hex 24"

# Adresa a doména si musí odpovídat, jinak Caddy vystaví certifikát
# na něco jiného, než na co míří odkazy v e-mailech.
if [[ -n "${NEXT_PUBLIC_SITE_URL:-}" && -n "${APP_DOMAIN:-}" ]]; then
  if [[ "$NEXT_PUBLIC_SITE_URL" != "https://$APP_DOMAIN" ]]; then
    cerveny "  ✗ NEXT_PUBLIC_SITE_URL a APP_DOMAIN si neodpovídají"
    echo "      NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL"
    echo "      čekal bych      https://$APP_DOMAIN"
    chyby=$((chyby + 1))
  fi
fi

if [[ $chyby -gt 0 ]]; then
  # Česky se počítané podstatné jméno mění: 1 položku, 2–4 položky, 5+ položek.
  if [[ $chyby -eq 1 ]]; then tvar="položku"
  elif [[ $chyby -lt 5 ]]; then tvar="položky"
  else tvar="položek"; fi

  cerveny "
Oprav $chyby $tvar v .env a spusť skript znovu:  nano .env"
  exit 1
fi

# ── Kontrola DNS ──────────────────────────────────────────────────
log "Kontroluji, kam míří doména"

moje_ip="$(curl -fsS -m 10 https://api.ipify.org || echo '')"
domena_ip="$(getent hosts "$APP_DOMAIN" | awk '{print $1}' | head -1 || echo '')"

echo "  IP tohoto serveru: ${moje_ip:-nezjištěno}"
echo "  $APP_DOMAIN míří na: ${domena_ip:-nikam}"

if [[ -n "$moje_ip" && -n "$domena_ip" && "$moje_ip" != "$domena_ip" ]]; then
  cerveny "
  Doména zatím míří jinam. Let's Encrypt certifikát nevydá a po
  neúspěchu chvíli čeká, než to zkusí znovu — počkej, až se DNS propíše."
  read -r -p "  Přesto pokračovat? [a/N] " odpoved
  [[ "$odpoved" =~ ^[aAyY]$ ]] || { echo "Zastaveno."; exit 1; }
fi

# ── Build ─────────────────────────────────────────────────────────
log "Stavím a spouštím (3–6 minut)"
docker compose up -d --build

log "Čekám, až aplikace naběhne"
for i in $(seq 1 60); do
  if docker compose ps app | grep -q healthy; then
    zeleny "
✓ Aplikace běží."
    docker compose ps
    echo
    zeleny "Otevři https://$APP_DOMAIN"
    echo
    echo "Certifikát si Caddy vyřídí sám. Když stránka první minutu"
    echo "hlásí problém s certifikátem, dej jí chvilku a načti znovu."
    echo
    echo "Nezapomeň v Supabase → Authentication → URL Configuration:"
    echo "   Site URL:       $NEXT_PUBLIC_SITE_URL"
    echo "   Redirect URLs:  $NEXT_PUBLIC_SITE_URL/auth/callback"
    exit 0
  fi
  sleep 3
done

cerveny "
✗ Aplikace do třech minut nenaběhla. Pošli výstup:"
echo "   docker compose ps"
echo "   docker compose logs --tail=60 app"
exit 1
