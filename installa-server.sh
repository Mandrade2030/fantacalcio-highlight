#!/usr/bin/env bash
# Installa Fanta Highlights su un server Linux (Ubuntu/Debian). Si lancia con:  bash installa-server.sh
set -e
REPO="Mandrade2030/fantacalcio-highlight"
DIR="$HOME/fantacalcio-highlight"

echo "⚽ Installazione Fanta Highlights"
if ! command -v docker >/dev/null 2>&1; then
  echo "→ Installo Docker…"
  curl -fsSL https://get.docker.com | sh
fi
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

if [ ! -d "$DIR/.git" ]; then
  read -rs -p "Token GitHub (premi solo Invio se il repository è pubblico): " TOKEN; echo
  if [ -n "$TOKEN" ]; then
    git clone "https://x-access-token:${TOKEN}@github.com/${REPO}.git" "$DIR"
    git -C "$DIR" remote set-url origin "https://github.com/${REPO}.git"   # non lascia il token salvato nel repo
  else
    git clone "https://github.com/${REPO}.git" "$DIR"
  fi
else
  git -C "$DIR" pull
fi
cd "$DIR"

if [ ! -f .env ]; then
  read -rs -p "Scegli una password per entrare nell'app (almeno 12 caratteri): " PW; echo
  [ ${#PW} -ge 12 ] || { echo "Password troppo corta."; exit 1; }
  printf 'FH_PASSWORD=%s\n' "$PW" > .env
  chmod 600 .env
fi

read -r -p "Vuoi anche un indirizzo https pubblico gratuito da girare agli amici? (s/N) " R
if [[ "$R" =~ ^[sSyY] ]]; then
  $SUDO docker compose --profile online up -d --build
  echo "Attendo l'indirizzo…"; sleep 12
  $SUDO docker compose logs tunnel 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1
else
  $SUDO docker compose up -d --build
  echo "Pronto: http://$(curl -s ifconfig.me 2>/dev/null || echo IP_DEL_SERVER):4321"
fi
