#!/bin/bash
# Aggiorna il server da GitHub quando ci sono novità (lo lancia cron ogni 30 minuti).
# - i file in dati/ modificati dall'app sul server hanno la precedenza su quelli del repo
# - il container si ricostruisce solo se è cambiato del codice (i dati sono un volume)
cd "$(dirname "$0")/.." || exit 1
exec 9>/tmp/fh-aggiorna.lock
flock -n 9 || exit 0
git fetch -q origin main || exit 0
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] && exit 0

NUOVI=$(git diff --name-only HEAD origin/main)
LOCALI=$(git diff --name-only -- dati)
SALVA=/tmp/fh-dati-locali
rm -rf "$SALVA"
for f in $LOCALI; do mkdir -p "$SALVA/$(dirname "$f")"; cp "$f" "$SALVA/$f"; done
[ -n "$LOCALI" ] && git checkout -- $LOCALI
# file nuovi del repo che sul server esistono già non tracciati: tiene quelli del server
for f in $(git diff --name-only --diff-filter=A HEAD origin/main); do
  if [ -e "$f" ] && ! git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    mkdir -p "$SALVA/$(dirname "$f")"; mv "$f" "$SALVA/$f"; LOCALI="$LOCALI $f"
  fi
done
if ! git merge -q --ff-only origin/main; then
  echo "$(date '+%F %T') merge non riuscito, riprovo al prossimo giro"
fi
for f in $LOCALI; do [ -e "$SALVA/$f" ] && cp "$SALVA/$f" "$f"; done

if echo "$NUOVI" | grep -qv '^dati/'; then
  sudo docker compose up -d --build app >/dev/null 2>&1 && echo "$(date '+%F %T') aggiornato e ricostruito: $(git log --oneline -1)"
else
  echo "$(date '+%F %T') aggiornati solo i dati: $(git log --oneline -1)"
fi
