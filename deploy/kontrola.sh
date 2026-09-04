#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  Kontrola po nasazení
#
#  Projde to, co se dá ověřit zvenku, a řekne, co nefunguje. Spouštět
#  po každém nasazení — chyba v nastavení se jinak pozná až tím, že se
#  někomu neodeslala pozvánka.
#
#      bash deploy/kontrola.sh
#      bash deploy/kontrola.sh muj@email.cz   # pošle i zkušební e-mail
# ═══════════════════════════════════════════════════════════════════
set -uo pipefail

cd "$(dirname "$0")/.."

zeleny() { printf '\033[1;32m%s\033[0m\n' "$1"; }
cerveny(){ printf '\033[1;31m%s\033[0m\n' "$1"; }
zluty()  { printf '\033[1;33m%s\033[0m\n' "$1"; }

[[ -f .env ]] && { set -a; source ./.env 2>/dev/null || true; set +a; }

ADRESA="${NEXT_PUBLIC_SITE_URL:-https://klidoo.cz}"
KOMU="${1:-}"
chyby=0

# Po restartu bývá první požadavek pomalý, než se stránka poprvé sestaví.
# Nula znamená, že spojení nedoběhlo — zkusíme to ještě dvakrát, než to
# prohlásíme za chybu.
stav_stranky() {
  local stav pokus
  for pokus in 1 2 3; do
    stav="$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$1")"
    [[ "$stav" != "000" ]] && break
    sleep 2
  done
  printf '%s' "$stav"
}

zkus() { # $1 = popis, $2 = cesta, $3 = očekávaný stav
  local stav
  stav="$(stav_stranky "${ADRESA}${2}")"
  if [[ "$stav" == "$3" ]]; then
    echo "  ✓ $1"
  else
    cerveny "  ✗ $1 — čekal jsem $3, přišlo $stav"
    chyby=$((chyby + 1))
  fi
}

printf '\n\033[1;32m▶ Veřejné stránky\033[0m\n'
zkus "úvodní stránka" "/" 200
zkus "ceník" "/cenik" 200
zkus "kalkulačka výživného" "/kalkulacka-vyzivneho" 200
zkus "zásady ochrany údajů" "/zasady-ochrany-osobnich-udaju" 200
zkus "sitemapa" "/sitemap.xml" 200

printf '\n\033[1;32m▶ Zabezpečení\033[0m\n'
# Aplikace za přihlášením musí přesměrovat, ne pustit dovnitř.
stav="$(stav_stranky "${ADRESA}/prehled")"
if [[ "$stav" == "307" || "$stav" == "302" ]]; then
  echo "  ✓ nepřihlášený se do aplikace nedostane"
else
  cerveny "  ✗ /prehled vrací $stav, čekal jsem přesměrování na přihlášení"
  chyby=$((chyby + 1))
fi

# Webhook bez podpisu musí odmítnout, ale existovat.
stav="$(curl -s -o /dev/null -w '%{http_code}' -m 15 -X POST "${ADRESA}/api/stripe/webhook")"
if [[ "$stav" == "400" || "$stav" == "503" ]]; then
  echo "  ✓ Stripe webhook odpovídá a bez podpisu nic nepustí"
  [[ "$stav" == "503" ]] && zluty "      (503 = chybí STRIPE_WEBHOOK_SECRET)"
else
  cerveny "  ✗ webhook vrací $stav"
  chyby=$((chyby + 1))
fi

printf '\n\033[1;32m▶ E-maily\033[0m\n'
if [[ -z "${CRON_SECRET:-}" ]]; then
  zluty "  ! CRON_SECRET není v .env, kontrolu SMTP přeskakuji"
else
  cesta="/api/mail/kontrola"
  [[ -n "$KOMU" ]] && cesta="${cesta}?komu=${KOMU}"
  odpoved="$(curl -s -m 30 -H "Authorization: Bearer ${CRON_SECRET}" "${ADRESA}${cesta}")"

  if grep -q '"ok":true' <<<"$odpoved"; then
    echo "  ✓ SMTP server odpovídá"
    if [[ -n "$KOMU" ]]; then
      if grep -q '"poslano":true' <<<"$odpoved"; then
        echo "  ✓ zkušební zpráva odeslána na $KOMU"
        zluty "      Zkontroluj i složku spam — a zkus to na Gmail i Seznam."
      else
        cerveny "  ✗ zprávu se nepodařilo odeslat"
        chyby=$((chyby + 1))
      fi
    fi
  else
    cerveny "  ✗ SMTP nefunguje: $odpoved"
    chyby=$((chyby + 1))
  fi
fi

printf '\n\033[1;32m▶ Kontejnery\033[0m\n'
if command -v docker >/dev/null 2>&1; then
  if docker compose ps app 2>/dev/null | grep -q healthy; then
    echo "  ✓ aplikace běží a je zdravá"
  else
    cerveny "  ✗ kontejner aplikace není zdravý"
    docker compose ps 2>/dev/null | sed 's/^/      /'
    chyby=$((chyby + 1))
  fi
else
  zluty "  ! docker tu není, kontrolu kontejnerů přeskakuji"
fi

echo
if [[ $chyby -eq 0 ]]; then
  zeleny "✓ Všechno odpovídá."
  echo
  echo "Zbývá ručně: zkušební platba ve Stripu, pozvánka druhému rodiči"
  echo "a lišta se souhlasem (po „Jen nutné\" nesmí odejít nic na Google)."
else
  cerveny "✗ Našel jsem $chyby problém(ů). Log aplikace:  docker compose logs --tail=50 app"
  exit 1
fi
