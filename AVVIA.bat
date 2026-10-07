@echo off
title Fanta Highlights
cd /d "%~dp0"
if not exist node_modules (
  echo Prima installazione, attendi qualche minuto...
  call npm install
)
echo.
echo  Avvio di Fanta Highlights... si aprira il browser.
echo  Per spegnere l'app chiudi questa finestra.
echo.
node app\server.mjs --apri
pause
