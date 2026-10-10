# Fantacalcio Highlights — contesto per Claude Code

> Leggi questo file prima di scrivere codice. Riassume le decisioni prese e lo stato attuale del progetto.

## Il concept

App privata per la lega di fantacalcio di Davide e dei suoi amici: **Ciempions Fig** (competizione "Campionato Gervasio Canedio", su fantacalcio.it, budget asta 500 crediti, rose da 25: 3P 8D 8C 6A). Dai risultati di una giornata genera, **per ogni scontro**, un **video highlight** verticale (MP4) e una **locandina**, da mandare nel gruppo WhatsApp.

- **8 squadre → 4 scontri per giornata → 4 highlight + 4 locandine** ogni settimana.
- Tono: trasmissione sportiva + sfottò tra amici (derby, scontri al vertice, lotta salvezza, prese in giro per chi perde).
- **Obiettivo n.1: effetto wow e qualità.** Meglio poche cose fatte benissimo.
- Uso strettamente privato: il video resta nel gruppo, nessuna pubblicazione.

## Decisioni prese

| Tema | Decisione |
|---|---|
| Fonte dati | Inserimento **manuale** una volta a settimana (la lega è su fantacalcio.it). Niente scraper/API per ora. |
| Output | MP4 h264 verticale 1080×1920 a 30 fps + locandina PNG 1080×1350 per scontro. |
| Motore | **Remotion 4** (video con React). |
| Render | Sul server di Davide (sempre online) o sul suo PC. Il telefono serve solo per inserire i dati. |
| Avatar calciatori | Immagini già esistenti (es. fantacalcio.it), messe in `public/giocatori/`. Senza immagine si usano le iniziali. |
| Avatar allenatori | **Custom**, uno per amico, con stati emotivi. Ora sono avatar SVG disegnati in codice; si potranno sostituire con PNG. |
| Voce | Telecronaca con **voce clonata** di Davide o di un amico consenziente, tramite un servizio TTS esterno. Niente voci di persone famose. |
| Animazioni | Libreria di **micro-animazioni** sugli avatar statici (gol, parata, rigore, cartellini…), niente animazione completa dei personaggi. |

## Stato attuale (cosa c'è già)

```
src/
  data/types.ts          modello dati (Lega, Squadra, GiornataInput, Giornata, …)
  data/lega.json         DATABASE della lega: 8 squadre vere con presidente, sigla, colori, avatar e rosa (nome, ruolo, costo)
  data/giornata.json     risultati della giornata (ESEMPIO con squadre/giocatori veri e punteggi inventati)
  lib/lega.ts            preparaGiornata(): unisce giornata.json + lega.json, ricava i ruoli dalla rosa
  lib/fanta.ts           logica: gol dalle soglie, eventi chiave, MVP, emozioni, tag automatici
  lib/telecronaca.ts     frasi della telecronaca (template deterministici + tormentoni per amico)
  lib/timeline.ts        durate delle scene (calcolate dai dati)
  components/Allenatore.tsx  avatar allenatore SVG con 6 emozioni animate
  components/Grafica.tsx     sfondo, transizioni, badge giocatore, coriandoli, barra telecronaca…
  scenes/                Intro, FaceOff, Momenti, CorsaAlGol, UomoPartita, Verdetto
  compositions/Highlight.tsx   il video di uno scontro
  compositions/Locandina.tsx   poster (con risultato o pre-partita)
  Root.tsx               registra Highlight-N, Locandina-N, Presentazione-N per ogni scontro
scripts/render-giornata.mjs   render di tutta la giornata in out/giornata-N/
dati/rose.csv            le stesse rose in CSV (apribile con Excel/Sheets)
```

### Struttura di un highlight (~30 s)
1. **Intro**: "GIORNATA 7" con le bande dei colori delle due squadre, nome della sfida e tag.
2. **Faccia a faccia**: allenatori "carichi", sigle, posizione in classifica, VS e prima frase di telecronaca.
3. **Momenti chiave** (massimo 6): gol / doppietta / tripletta con assist, rigore parato, rigore sbagliato, rosso, giallo, autogol, disastro (voto ≤ 4,5). Il colpo più grosso del vincitore chiude la sequenza.
4. **Corsa al gol**: i fantapunti salgono come termometri; ogni soglia superata fa un gol.
5. **Uomo partita**: il miglior fantavoto dello scontro.
6. **Verdetto**: tabellone finale, allenatori con la loro emozione, coriandoli per chi vince, telecronaca.

### Regole già implementate
- Gol: 66 = 1 gol, poi +1 ogni 4 punti (configurabile con `soglie`). `golCasa` e `golTrasferta` nel JSON, se presenti, hanno la precedenza.
- Emozioni: vittoria → esultanza · pari → neutro · −1 → rabbia · −2 → tristezza · −3 o peggio → pianto. Nelle scene di presentazione si usa "grinta".
- Tag automatici: entrambe le squadre nelle prime 3 → "vertice"; entrambe nelle ultime 3 → "salvezza"; 3 o più gol di scarto → "goleada". "derby" va messo a mano nel JSON.
- Verdetti: goleada, netta, misura, beffa (perso di un gol e mancavano ≤ 1,5 punti alla soglia), pari, pari spettacolo (3+ gol a testa).

## Le squadre (lega.json)

| id | Squadra | Sigla | Presidente (nome nei video) |
|---|---|---|---|
| pan-fc | Pan Fc | PAN | Mandrade (= Davide, confermato) |
| atletico-madrink | Atletico Madrink | ATM | Luca |
| aquafan | Aquafan | AQF | Pres Ente |
| aston-birra | Aston Birra | AST | ErikB95 |
| do-flamengo | Do Flamengo | DFL | elgringo95 |
| milano-boys | Milano Boys | MIB | Gian Marco il Bello |
| manchester-squiddi | Manchester Squiddi | MSQ | Peppe Guardia |
| si-gonfia-la-rete | Si Gonfia La Rete | SGR | Ema |

- I presidenti sono i nickname dell'app: da sostituire con i nomi veri se si preferisce.
- Stemmi in `public/loghi/<id>.png` (campo `logo`). Quelli attuali sono ritagli PROVVISORI a bassa risoluzione dallo screenshot dell'app: Davide manderà gli originali, basta sovrascrivere i file con lo stesso nome. Compaiono in faccia a faccia, tabellone finale e locandine.
- Avatar: ORA realistici, vettoriali (SVG), costruiti dalle foto dei presidenti: parametri per persona in `lega.json` → `avatar` (viso, capelli, barba, occhiali, vestito…, vedi `StileAvatar`). Le foto NON sono nel repo. (Piano originale:) Davide manderà una foto del volto di ogni presidente. Piano: adattare i parametri dell'avatar SVG (forma viso, capelli, barba, occhiali, pelle) per somigliare; in alternativa PNG per emozione in `public/allenatori/<id>/<emozione>.png` (campo `immagini`).
- I colori sono ricavati dagli stemmi. Se due squadre in uno scontro hanno colori troppo simili, la trasferta usa il colore secondario (`analizzaScontro`).
- Le rose sono quelle post-asta (6/10/2026), verificate: spesa + crediti residui = 500 per ogni squadra.
- I nomi dei giocatori sono nel formato di fantacalcio.it ("Martinez L.", "Esposito F.P."). In giornata.json vanno scritti uguali, accenti esclusi (il confronto li ignora). Se un nome non è in rosa, il render si ferma con un errore chiaro.

## Come si inserisce una giornata

```json
{
  "giornata": 1,
  "classificaPrima": [{ "allenatore": "pan-fc", "punti": 0 }],
  "scontri": [
    {
      "casa": "pan-fc", "trasferta": "si-gonfia-la-rete",
      "punteggioCasa": 74, "punteggioTrasferta": 67.5,
      "tag": ["derby"], "nomeSfida": "facoltativo",
      "formazioneCasa": [{ "nome": "Kean", "voto": 7.5, "fantavoto": 13.5, "gol": 2 }],
      "formazioneTrasferta": []
    }
  ]
}
```
Bastano i giocatori "notevoli" (gol, assist, rigori, cartellini, voti disastrosi, portiere). Se `classificaPrima` manca o è tutta a zero (inizio stagione), niente tag vertice/salvezza e nel faccia a faccia compare il presidente al posto della posizione.

## Dati da leghe.fantacalcio.it (import)

Le giornate in `dati/giornata-N.json` vengono importate dalla lega su leghe.fantacalcio.it (lega `ciempions-fig`, competizione `645622`) leggendo le API usate dal sito web, con la sessione dell'utente loggato nel browser (nessuna password o token salvati nel progetto).

- Calendario e risultati: `GET https://apileague.fantacalcio.it/onboarding/v1/league/competition/calendar/645622` → per giornata `matchDay`, `championshipMatchDay` (giornata di Serie A), `calculated`, `matches[{tIdH,tIdA,ptH,ptA,result,standingPtH,standingPtA}]`.
- Formazioni con voti: `GET /gaming/v1/teamLineup/645622/{matchDay}/{championshipMatchDay}` → per squadra `tid`, `tot`, `starts[]`, `bench[]` con `pid`, `scr` (voto, 56 = s.v.), `cscr` (fantavoto), `ptype` (E = entrato, U = uscito/non giocato), `b` = 16 contatori separati da `;`.
- Indici di `b`: 0 ammonizioni, 1 espulsioni, 2 gol, 3 gol subiti, 4 rigori parati, 5 rigori sbagliati, 6 rigori segnati, 7 autogol, 8 gol vittoria, 9 gol pareggio, 10 porta inviolata, 11 ultimo passaggio, 12 assist soft, 13 assist, 14 assist gold, 15 MVP.
- Giocatori: `GET /onboarding/v1/league/players` → `players[{id,name,fcrle(1 P,2 D,3 C,4 A),tname,img}]`. Squadre: `GET /onboarding/v1/league/teams` → `data[{id,n,nu,l}]`.
- Header richiesti: `app_key` e `Authorization: Bearer <token di lega>` (li ha la sessione del sito).
- Figurine: `https://content.fantacalcio.it/web/campioncini/21/large/{img}.png` (512×512, sfondo trasparente). Stemmi: `https://d2lhpso9w1g8dk.cloudfront.net/web/risorse/squadra_2026/{l}`.
- Regola gol della lega: 66 = 1 gol, poi +1 ogni **4** punti (verificato su tutti gli scontri).
- Id squadre fantacalcio → id progetto: in `lega.json` (`idFantacalcio`).

## Audio

- `public/audio/*.mp3`: musica (120 BPM, Mi minore, 32 battute) ed effetti **originali**, generati da `tools/genera_audio.py` (numpy + scipy + ffmpeg, seed fisso). Per cambiarli: modifica lo script e rilancialo.
- `src/lib/audio.ts`: la "regia" dei suoni. `cueAudio()` decide cosa suona e quando (whoosh sui tagli, impatto sul VS e sul numero della giornata, folla sui gol, buu su errori e disastri, fischi sui cartellini e sul finale, ding a ogni soglia gol superata, scintille sull'uomo partita, macchina da scrivere sotto la telecronaca). `volumeMusica()` gestisce fade e ducking (musica più bassa su boati e voce).
- Il video `Highlight` accetta `audio: false` per avere il muto.

## Telecronaca parlata

Tre servizi, scelti dal pannello "Telecronaca parlata" dell'app (impostazioni in `dati/impostazioni.json`, solo sul PC, in .gitignore):
- **Google Gemini (default, gratis)**: chiave gratuita da aistudio.google.com/apikey. `POST https://generativelanguage.googleapis.com/v1beta/interactions` con header `x-goog-api-key`, modello `gemini-3.8-flash-tts`, voce in `generation_config.speech_config[0].voice` (default Fenrir), tono in `annotations[{type:"speech_metadata", style}]`. Risposta: audio base64 in `steps[type=model_output].content[type=audio].data` (WAV 24 kHz mono 16 bit; se arriva PCM grezzo il server aggiunge l'intestazione WAV).
- **Voci di Windows (gratis, offline)**: PowerShell + System.Speech, WAV. Qualità più bassa.
- **ElevenLabs (a pagamento per la voce clonata)**: `POST /v1/text-to-speech/{voiceId}`, mp3 128 kbps.

Funzionamento: quando si genera un video con la voce attiva, il server compila `src/lib/frasi.ts` con esbuild (stesse frasi del video), genera un file per battuta in `public/voce/<hash>.(wav|mp3)` (cache: stessa frase + voce + tono = nessuna nuova richiesta) e passa a Remotion `voci[indice] = { pre, mvp, verdetto }` con file e durata in frame. `calcolaTimeline()` allunga le scene se la battuta è più lunga. Se la voce fallisce (chiave, limite gratuito) i video escono comunque senza voce e l'errore compare nell'app.

## App di inserimento (senza terminale)

- `AVVIA.bat` (doppio clic) → installa se serve, avvia l'app Node in `app/` e apre http://localhost:4321.
- Server Node puro, nessuna dipendenza. API: `/api/lega`, `/api/giornate`, `/api/giornata/:n` (GET), `/api/giornata` (POST salva in `dati/giornata-N.json`), `/api/genera` (coda render), `/api/lavori` (avanzamento), `/api/annulla`, `/api/apri-cartella/:n`. Serve `out/` (con Range per i video) e `public/`.
- Il render usa la CLI: `npx remotion render|still <Composizione> <file> --props=out/giornata-N/_props.json`; l'avanzamento si legge dall'output ("Rendered x/y"). `FH_SIMULA=1` finge il render per i test.
- `app/ui/`: HTML + CSS + JS puro. 4 scontri, squadre con stemma, fantapunti → gol live, giocatori scelti dalle rose, fantavoto calcolato in automatico (gol +3, assist +1, amm −0,5, esp −1, rig. sbagliato −3, rig. parato +3, autogol −2, gol subito −1) se non inserito a mano. Bozza salvata nel browser.
- Ascolta su 0.0.0.0: dalla stessa rete Wi-Fi si può aprire anche dal telefono con l'IP del PC.

## Comandi

```bash
npm install
npm run studio              # anteprima live nel browser (Remotion Studio)
npm run render:giornata     # 4 MP4 + 8 PNG in out/giornata-N/
npm run render:giornata -- percorso/altra-giornata.json
```

## Roadmap

### Fatto
- [x] Progetto Remotion, scena titolo, scontro con dati finti
- [x] Avatar allenatori con emozioni (versione SVG segnaposto)
- [x] Micro-animazioni calciatori (gol, assist, parata, rigore sbagliato, cartellini, autogol, disastro)
- [x] Corsa al gol, MVP, verdetto, telecronaca testuale
- [x] Locandine (risultato e pre-partita)

### Prossimi passi
1. **Dati veri**: ✅ squadre e rose in `lega.json`. Mancano: calendario, risultati veri in `giornata.json`, foto dei giocatori (`immagine` in rosa → `public/giocatori/`).
2. **Allenatori veri**: decidere lo stile e produrre un PNG trasparente per ogni emozione → `public/allenatori/<id>/<emozione>.png` e campo `immagini` nel JSON. Il componente li usa in automatico mantenendo le animazioni.
3. **Audio**: ✅ musica ed effetti originali sincronizzati.
4. **Voce**: ✅ Gemini (gratis), Windows, ElevenLabs. Prossimo: più battute (es. sui gol), voce clonata.
5. **Riepilogo giornata** (facoltativo): un video unico con i 4 risultati, i premi (top, flop, panchina d'oro) e la classifica aggiornata.
6. **Frontend di inserimento** mobile (React) che produce il JSON.
7. **Server di render** con `@remotion/renderer` e download dell'MP4.

### Lista desideri
- Animazioni vere dei personaggi.
- Import automatico da fantacalcio.it.
- Telecronaca generata da un LLM che ricorda gli episodi passati della lega.

## Domande aperte
- Nomi veri dei presidenti (ora ci sono i nickname) e loro aspetto per gli avatar.
- Calendario degli scontri.
- Soglie gol della lega (se non sono 66/+6) e uso o meno del modificatore difesa.
- Stile grafico degli allenatori definitivi (cartoon, caricatura, 3D?).
- Tormentoni e "lore" del gruppo per la telecronaca (campo `tormentoni` nel JSON).
- Servizio TTS e budget.

## Principi
- **Un solo JSON** in ingresso: stesso input → stesso video (anche le frasi sono deterministiche).
- Dati, logica del racconto (`lib/`) e grafica (`components/`, `scenes/`) restano separati.
- Le durate delle scene si calcolano dai dati.
- Piccoli passi visibili: ogni modifica deve produrre qualcosa da guardare nello Studio.
- Il movimento fa la qualità: spring, easing, timing. Niente animazioni lineari.
- Non usare `Math.random()` nei componenti: il render deve restare deterministico.

## Online (server)
`Dockerfile` + `docker-compose.yml` + `ONLINE.md`. Con `FH_SERVER=1` l'app esige `FH_PASSWORD` (login con cookie firmato, 5 tentativi sbagliati = blocco 1 minuto), nasconde "Apri cartella" e le voci di Windows. `/healthz` è pubblico. Volumi: `dati/`, `out/`, `voce/`. Tunnel https gratuito con `--profile online` (cloudflared). L'import automatico da leghe.fantacalcio.it NON gira sul server (usa il login del browser di Claude).

## Bot WhatsApp (non ufficiale)
- `app/whatsapp.mjs`: libreria Baileys, si collega come "dispositivo collegato" (QR). Sessione in `dati/whatsapp/` (volume, in .gitignore). Pensato per un numero dedicato al bot: WhatsApp può bloccarlo.
- Pannello "📲 Bot WhatsApp" nell'app: QR, scelta del gruppo (salvato in `dati/impostazioni.json` → `whatsapp.gruppo`), invio di un file caricato + didascalia; tasto 📲 su ogni file della galleria.
- API: `GET /api/whatsapp` (stato + QR), `GET /api/whatsapp/gruppi`, `POST /api/whatsapp/gruppo`, `POST /api/whatsapp/esci`, `POST /api/whatsapp/invia` (JSON `{testo, file:"giornata-N/x.mp4"}` oppure corpo binario immagine/video con `?testo=`).
- Prova rapida sul server: `sudo docker exec fantacalcio-highlight-app-1 node tools/prova-whatsapp.mjs`.

## Locandina pre-giornata
`tools/pregiornata/`: cast delle caricature, istruzioni e prompt per Gemini, `etichette.py` per scrivere posizione e punti esatti.

## Pre-giornata (copertina + sfide)
- Composizioni `Copertina` (1080x1920, i 4 scontri) e `Sfida-N` (1080x1350, una sfida): per ogni squadra il capitano grande + 3 big, presidente piccolo, posizione e punti. Figure = "campioncini" di fantacalcio.it (`https://content.fantacalcio.it/web/campioncini/21/large/{img}.png`, SENZA `?v=`), `img` salvato per ogni giocatore in `lega.json` → rosa.
- `dati/calendario.json`: tutte le giornate della lega (scontri). `dati/pregiornata-N.json`: scelte salvate (4 big, capitano).
- App: pannello "🗓 Pre-giornata" → `GET /api/pregiornata` (prossima giornata), `GET /api/pregiornata/:n` (bozza: file salvato o i 4 più pagati, classifica calcolata dalle giornate salvate), `POST /api/pregiornata` (salva e mette in coda i render → `out/giornata-N/copertina-giornata-N.png` e `pregiornata-i-…png`).
- Gemini NON disegna calciatori veri: per questo si usano i campioncini.
- **Formazioni vere**: `dati/formazioni-N.json` (`{giornata, aggiornato, squadre:{<id>:{capitano,vice,modulo,titolari[]}}}`), prodotto da `tools/formazioni-browser.js` eseguito nella pagina di leghe.fantacalcio.it loggata (imposta prima `window.__giornata = N`). Il server prende la copia più recente tra locale e GitHub raw (`main/dati/formazioni-N.json`, o `FH_FORMAZIONI_URL`): quindi per aggiornare il server basta fare push del file.
- Regola 4 big: capitano + 3 titolari più pagati; senza formazione i 4 più pagati della rosa. Le formazioni si applicano sia all'apertura del pannello sia a ogni "Genera" (`applicaFormazioni`), tranne sulle squadre cambiate a mano nell'app (`manuale: true`).

## App Android
- `android/`: app nativa minima (Java, WebView) "Ciempions Fig", `it.ciempionsfig.app`. Apre l'app web del server; l'indirizzo lo legge da `server-url.txt` (raw GitHub) → **aggiornare quel file se cambia il tunnel**. Scarica video/immagini di `/out/` in Download/Ciempions Fig e apre "Condividi". Upload file (pannello WhatsApp) supportato.
- Build e firma su GitHub Actions (`.github/workflows/android.yml`) a ogni push in `android/`: release `app-vN`. Link fisso: https://github.com/Mandrade2030/fantacalcio-highlight/releases/latest/download/ciempions-fig.apk
- Firma: `android/release.jks` + `android/keystore.properties` (nel repo: se il repo resta pubblico, chiunque può firmare APK "compatibili"; spostarli in secrets quando si rende privato).
