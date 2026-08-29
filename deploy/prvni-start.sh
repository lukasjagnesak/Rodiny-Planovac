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
zluty() { printf '\033[1;33m%s\033[0m\n' "$1"; }
log() { printf '\n\033[1;32m▶ %s\033[0m\n' "$1"; }

if [[ ! -f .env ]]; then
  cerveny "Chybí .env. Vytvoř ho:  cp .env.example .env && nano .env"
  exit 1
fi

# ── Kontrola proměnných ───────────────────────────────────────────
log "Kontroluji .env"

# Znaky, které shell bere jako příkaz, ne jako text. `SMTP_FROM=Klidoo
# <ahoj@klidoo.cz>` vypadá nevinně, ale `<` je přesměrování a `source .env`
# na tom skončí syntaktickou chybou — tenhle skript by spadl dřív, než
# cokoli zkontroluje. Uvozovky nepomůžou, ty zase vadí Compose.
if grep -qE '^[A-Z_]+=[^#]*[<>|;&`$()]' .env; then
  cerveny "  ✗ některé hodnoty obsahují znaky, kterým shell nerozumí:  < > | ; & \` $ ( )"
  grep -nE '^[A-Z_]+=[^#]*[<>|;&`$()]' .env | cut -d= -f1 | sed 's/^/      /'
  echo "      Uvozovky to nespraví. Rozděl hodnotu (SMTP_FROM_NAME a SMTP_FROM_EMAIL)"
  echo "      nebo si nech vygenerovat heslo bez těchhle znaků."
  exit 1
fi

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

# ── Hygiena souboru ───────────────────────────────────────────────
#
#  Předchozí kontrola se dívá na proměnné až po `source`, jenže shell při
#  načtení uvozovky odstraní. Hodnota `"https://…"` tak projde jako
#  v pořádku, ale Docker Compose ji předá i s uvozovkami a Supabase klient
#  spadne — až za běhu, po celém buildu. Proto se tu čte samotný soubor.

radek_hodnoty() { # $1 = název proměnné, vrátí syrovou hodnotu ze souboru
  local radek
  radek="$(grep -m1 "^$1=" .env || true)"
  printf '%s' "${radek#"$1"=}"
}

if grep -q $'\r' .env; then
  cerveny "  ✗ .env má řádky zakončené po windowsku (CRLF)"
  echo "      Neviditelný znak na konci se stane součástí hodnoty."
  echo "      Oprav:  sed -i 's/\r\$//' .env"
  chyby=$((chyby + 1))
fi

if grep -qE "^[A-Z_]+=[\"']" .env; then
  cerveny "  ✗ některé hodnoty jsou v uvozovkách — .env je nechce"
  grep -nE "^[A-Z_]+=[\"']" .env | cut -d: -f2 | cut -d= -f1 | sed 's/^/      /'
  chyby=$((chyby + 1))
fi

# Adresa Supabase je nejčastější místo, kde se to zvrtne, a chyba se
# projeví až tím, že aplikace nenaběhne. Nesmí obsahovat uvozovky,
# mezery ani chybět schéma.
supabase_url="$(radek_hodnoty NEXT_PUBLIC_SUPABASE_URL)"
if [[ -n "$supabase_url" ]] && ! [[ "$supabase_url" =~ ^https?://[^[:space:]\"\'/]+(/.*)?$ ]]; then
  cerveny "  ✗ NEXT_PUBLIC_SUPABASE_URL není použitelná adresa"
  echo "      mám:    $supabase_url"
  echo "      čekám:  https://neco.supabase.co — bez uvozovek a bez mezer"
  chyby=$((chyby + 1))
fi

# ── Nepovinné, ale bez nich část aplikace mlčí ────────────────────
#
#  Tyhle nezastavují nasazení: aplikace běží i bez plateb a e-mailů.
#  Zjistit to až od zákazníka, kterému nepřišla pozvánka, je ale horší
#  než vidět to tady.

doporuc() {
  local jmeno="$1" popis="$2"
  if [[ -z "${!jmeno:-}" ]]; then
    zluty "  ! $jmeno není nastavené — $popis"
  else
    echo "  ✓ $jmeno"
  fi
}

doporuc SMTP_HOST   "pozvánky a upozornění se nepošlou (README, kapitola 5b)"
doporuc SMTP_PASS   "SMTP bez hesla neodešle nic"
doporuc SMTP_FROM_EMAIL "bez odesílatele z vlastní domény zprávy končí ve spamu"
doporuc STRIPE_SECRET_KEY "nepůjde zaplatit předplatné"
doporuc STRIPE_WEBHOOK_SECRET "platba proběhne, ale aplikace se o ní nedozví"

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
#
#  Nestačí se zeptat na jednu adresu. Typický stav po přesměrování domény
#  je, že u registrátora zůstane starý záznam na parkovací stránku vedle
#  nového na server. Pak se návštěvníci střídavě trefují jinam a Let's
#  Encrypt ověření neprojde, protože výzvu dostane parkovací nginx.
#  Stejně tak zapomenutý AAAA záznam: kdo má IPv6 (skoro každý mobil),
#  jde po něm přednostně a server nikdy neuvidí.
log "Kontroluji, kam míří doména"

zaznamy() { # $1 = jméno, $2 = A nebo AAAA
  # `|| true` na konci každé větve: chybějící záznam je legitimní odpověď,
  # ne chyba. Bez toho `pipefail` shodí celý skript, protože grep bez
  # nálezu vrací nenulový kód — a doména bez AAAA je přitom v pořádku.
  if command -v dig >/dev/null 2>&1; then
    dig +short "$2" "$1" 2>/dev/null | grep -E '^[0-9a-fA-F.:]+$' | sort -u || true
  elif [[ "$2" == "A" ]]; then
    getent ahostsv4 "$1" 2>/dev/null | awk '{print $1}' | sort -u || true
  else
    getent ahostsv6 "$1" 2>/dev/null | awk '{print $1}' | sort -u || true
  fi
}

moje_ip4="$(curl -fsS -m 10 https://api.ipify.org || echo '')"
moje_ip6="$(curl -fsS -m 10 -6 https://api64.ipify.org 2>/dev/null || echo '')"

echo "  IPv4 tohoto serveru: ${moje_ip4:-nezjištěno}"
if [[ -n "$moje_ip6" ]]; then
  echo "  IPv6 tohoto serveru: $moje_ip6"
fi

potize_dns=0

# Caddyfile vystavuje i www, takže certifikát se žádá na obě jména.
# Špatné www rozbije vydání certifikátu pro celou doménu.
for jmeno in "$APP_DOMAIN" "www.$APP_DOMAIN"; do
  a="$(zaznamy "$jmeno" A)"
  aaaa="$(zaznamy "$jmeno" AAAA)"

  echo "  $jmeno → A: ${a//$'\n'/, } ${aaaa:+| AAAA: ${aaaa//$'\n'/, }}"

  if [[ -z "$a" ]]; then
    cerveny "    ✗ žádný A záznam"
    potize_dns=$((potize_dns + 1))
    continue
  fi

  navic="$(printf '%s\n' "$a" | grep -vxF "$moje_ip4" || true)"
  if [[ -n "$moje_ip4" && -n "$navic" ]]; then
    cerveny "    ✗ míří i jinam než na tenhle server: ${navic//$'\n'/, }"
    echo "      Smaž ten záznam u registrátora, jinak část lidí skončí jinde"
    echo "      a Let's Encrypt certifikát nevydá."
    potize_dns=$((potize_dns + 1))
  fi

  if [[ -n "$aaaa" ]]; then
    zbyle6="$(printf '%s\n' "$aaaa" | grep -vxF "${moje_ip6:-nic}" || true)"
    if [[ -n "$zbyle6" ]]; then
      cerveny "    ✗ AAAA míří jinam: ${zbyle6//$'\n'/, }"
      echo "      Kdo má IPv6, jde po něm přednostně a na server se nedostane."
      echo "      Smaž AAAA záznam, nebo ho nastav na IPv6 tohoto serveru."
      potize_dns=$((potize_dns + 1))
    fi
  fi
done

if [[ $potize_dns -gt 0 ]]; then
  cerveny "
  DNS zatím není v pořádku. Doporučuju to nejdřív spravit u registrátora
  a počkat, až se změna propíše — Let's Encrypt má po neúspěchu limit
  a další pokus chvíli trvá."
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
