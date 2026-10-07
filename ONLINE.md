# Mettere online Fanta Highlights

Serve un server Linux con **almeno 4 GB di RAM** (es. un VPS da qualche euro al mese, oppure Oracle Cloud "always free").
Un video da 30 s si renderizza in 1–3 minuti; una giornata intera (4 video + 8 locandine) in 5–12 minuti.

## Via rapida
Sul server: `curl -fsSL -H "Authorization: token TOKEN" https://raw.githubusercontent.com/Mandrade2030/fantacalcio-highlight/main/installa-server.sh -o installa-server.sh && bash installa-server.sh` (fa tutto lui e ti chiede token e password).

## 1. Sul server (una volta sola)
```bash
curl -fsSL https://get.docker.com | sh
```

## 2. Copia il progetto sul server
Dal tuo PC (PowerShell), dalla cartella `D:\parla\progetti`:
```powershell
scp -r fantacalcio-highlight utente@IP_DEL_SERVER:~/
```
(escludi `node_modules` e `out`: se esistono cancellali prima o usa il file zip senza di essi)

## 3. Imposta la password e avvia
```bash
cd ~/fantacalcio-highlight
cp .env.example .env
nano .env                      # cambia FH_PASSWORD
docker compose up -d --build   # la prima volta ci mette 5–10 minuti
```
Apri `http://IP_DEL_SERVER:4321` e inserisci la password.

## 4. Indirizzo https da girare agli amici (facoltativo)
```bash
docker compose --profile online up -d --build
docker compose logs tunnel | grep trycloudflare
```
Esce un indirizzo `https://qualcosa.trycloudflare.com`: funziona da telefono, senza aprire porte.
L'indirizzo cambia se il tunnel si riavvia. Per un indirizzo fisso serve un dominio (Caddy o un tunnel Cloudflare con account gratuito).

> ⚠️ Chiunque abbia indirizzo **e** password può generare video e usare la tua chiave Gemini. Usa una password lunga e non girarla a chi non serve.

## Aggiornare l'app
```bash
cd ~/fantacalcio-highlight && docker compose up -d --build
```
I dati (`dati/`, `out/`, `voce/`) restano nelle cartelle del progetto.

## Limiti da sapere
- **Import automatico delle giornate**: parte dal tuo account fantacalcio nel browser di Claude, quindi non gira sul server. Le giornate nuove vanno copiate in `dati/` (o inserite nell'app).
- Voci di Windows e "Apri cartella" non esistono sul server: resta Gemini (o ElevenLabs).
