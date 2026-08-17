#!/usr/bin/env bash
# Aktualizace běžící instance na nejnovější verzi z gitu.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "▶ Stahuji změny"
git pull --ff-only

echo "▶ Přestavuji obraz"
docker compose build

echo "▶ Restartuji"
docker compose up -d

echo "▶ Úklid starých obrazů"
docker image prune -f

echo "✓ Hotovo"
docker compose ps
