#!/usr/bin/env bash
# Aktualizace běžící instance na nejnovější verzi z gitu.
set -euo pipefail

cd "$(dirname "$0")/.."

PRED="$(git rev-parse HEAD)"

echo "▶ Stahuji změny"
git pull --ff-only

# Zapomenutá migrace se projeví až tím, že někomu spadne stránka —
# proto se nové soubory vypíšou dřív, než se cokoli restartuje.
NOVE_MIGRACE="$(git diff --name-only --diff-filter=A "$PRED" HEAD -- supabase/migrations/ || true)"

if [[ -n "$NOVE_MIGRACE" ]]; then
  echo
  echo "══════════════════════════════════════════════════════════════"
  echo " POZOR: přibyly migrace. Spusť je v Supabase → SQL Editor,"
  echo " v tomhle pořadí, ještě než pustíš novou verzi:"
  echo
  echo "$NOVE_MIGRACE" | sed 's/^/   /'
  echo "══════════════════════════════════════════════════════════════"
  echo
  read -r -p "Máš je nahrané? Pokračovat? [a/N] " odpoved
  [[ "$odpoved" =~ ^[aAyY]$ ]] || { echo "Zastaveno."; exit 1; }
fi

# Nová verze často přinese i novou proměnnou. Když chybí, aplikace
# většinou naběhne a jen tiše nedělá půlku toho, co má — pozvánky se
# neodešlou, platba se nedokončí. Radši to říct teď než po týdnu.
CHYBEJICI=""
while IFS= read -r klic; do
  grep -q "^${klic}=" .env || CHYBEJICI="$CHYBEJICI $klic"
done < <(grep -oE '^[A-Z_]+=' .env.example | tr -d '=' | sort -u)

if [[ -n "$CHYBEJICI" ]]; then
  echo
  echo "══════════════════════════════════════════════════════════════"
  echo " V .env chybí proměnné, které zná .env.example:"
  for klic in $CHYBEJICI; do echo "   $klic"; done
  echo
  echo " Bez nich aplikace poběží, ale příslušná část bude mlčet."
  echo " Popis každé z nich je v .env.example a v README."
  echo "══════════════════════════════════════════════════════════════"
  echo
  read -r -p "Pokračovat i tak? [a/N] " odpoved
  [[ "$odpoved" =~ ^[aAyY]$ ]] || { echo "Zastaveno. Doplň je:  nano .env"; exit 1; }
fi

echo "▶ Přestavuji obraz"
docker compose build

echo "▶ Restartuji"
docker compose up -d

echo "▶ Úklid starých obrazů"
docker image prune -f

echo "▶ Čekám, až aplikace naběhne"
for i in $(seq 1 30); do
  if docker compose ps app | grep -q healthy; then
    echo "✓ Běží"
    docker compose ps
    exit 0
  fi
  sleep 2
done

echo "✗ Aplikace do minuty nenaběhla. Podívej se do logu:"
echo "   docker compose logs --tail=50 app"
exit 1
