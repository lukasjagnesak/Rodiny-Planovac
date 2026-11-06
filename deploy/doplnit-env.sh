#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  Doplní do .env proměnné, které přibyly v .env.example
#
#  Existující hodnoty nepřepisuje — jen přidá chybějící klíče
#  s prázdnou hodnotou a s komentářem, k čemu jsou. Původní soubor
#  se před zásahem zazálohuje.
#
#      bash deploy/doplnit-env.sh
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

cd "$(dirname "$0")/.."

zeleny() { printf '\033[1;32m%s\033[0m\n' "$1"; }
zluty()  { printf '\033[1;33m%s\033[0m\n' "$1"; }
cerveny(){ printf '\033[1;31m%s\033[0m\n' "$1"; }

if [[ ! -f .env ]]; then
  cerveny "Chybí .env. Vytvoř ho:  cp .env.example .env"
  exit 1
fi

zaloha=".env.zaloha-$(date +%Y%m%d-%H%M%S)"
cp .env "$zaloha"

pridano=0

# Projde .env.example a chybějící klíče přenese i s komentářem nad nimi.
komentar=""
while IFS= read -r radek; do
  if [[ "$radek" =~ ^# ]]; then
    komentar+="$radek"$'\n'
    continue
  fi

  if [[ -z "$radek" ]]; then
    komentar=""
    continue
  fi

  klic="${radek%%=*}"
  [[ "$klic" =~ ^[A-Z_]+$ ]] || { komentar=""; continue; }

  if grep -q "^${klic}=" .env; then
    komentar=""
    continue
  fi

  # Rozumnou výchozí hodnotu z .env.example přeneseme (port, jméno
  # odesílatele), zástupný text ne — prázdné pole je jasnější než
  # „sk_live_…", které vypadá jako by už bylo vyplněné.
  hodnota="${radek#*=}"
  if [[ "$hodnota" =~ (\.\.\.|…|^<|xxxx|^ey[A-Za-z]|^sk_|^pk_|^price_|^whsec_|^re_|^G-) ]]; then
    hodnota=""
  fi

  {
    echo
    printf '%s' "$komentar"
    echo "${klic}=${hodnota}"
  } >> .env

  echo "  + $klic"
  pridano=$((pridano + 1))
  komentar=""
done < .env.example

if [[ $pridano -eq 0 ]]; then
  rm -f "$zaloha"
  zeleny "✓ .env má všechno, co .env.example zná. Nic se nepřidávalo."
  exit 0
fi

echo
zluty "Přidáno $pridano prázdných položek. Doplň jim hodnoty:"
echo "    nano .env"
echo
echo "Záloha původního souboru: $zaloha"
echo
zluty "Hodnoty nedávej do uvozovek a nepiš do nich  < > | ; & \$ ( )"
