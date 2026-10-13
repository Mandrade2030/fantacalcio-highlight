#!/bin/bash
# Una volta sola sul server: attiva l'aggiornamento automatico da GitHub (cron ogni 5 minuti).
DIR=$(cd "$(dirname "$0")/.." && pwd)
chmod +x "$DIR/tools/auto-aggiorna.sh"
( crontab -l 2>/dev/null | grep -v auto-aggiorna.sh ; echo "*/5 * * * * $DIR/tools/auto-aggiorna.sh >> \$HOME/fh-aggiorna.log 2>&1" ) | crontab -
echo "Aggiornamento automatico attivo (ogni 5 minuti). Log: ~/fh-aggiorna.log"
sudo docker compose -f "$DIR/docker-compose.yml" up -d --build app >/dev/null 2>&1 && echo "Server aggiornato: $(cd "$DIR" && git log --oneline -1)"
