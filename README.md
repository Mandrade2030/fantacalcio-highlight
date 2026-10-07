# ⚽ Fantacalcio Highlights

Video highlight e locandine per ogni scontro della giornata, generati con [Remotion](https://www.remotion.dev).

## Il modo facile: l'app

Doppio clic su **AVVIA.bat**. Si apre il browser con il modulo della giornata:
scegli le squadre, scrivi i fantapunti, aggiungi i giocatori dalle rose, premi **Genera tutto**.
Video e locandine compaiono nella pagina e nella cartella `out\giornata-N`.

## Avvio da terminale (per sviluppare)

Serve **Node.js 18 o più recente**.

```bash
npm install
npm run studio
```

Si apre il Remotion Studio nel browser. Nella barra a sinistra trovi, per ogni scontro:

- `Highlight-1` … `Highlight-4`: i video;
- `Locandina-1` … `Locandina-4`: i poster con il risultato;
- `Presentazione-1` … `Presentazione-4`: i poster pre-partita.

## Generare i file della giornata

```bash
npm run render:giornata
```

I file finiscono in `out/giornata-N/`. Gli MP4 sono in h264 e si mandano direttamente su WhatsApp.

## Inserire una giornata vera

Squadre e rose sono già in `src/data/lega.json` (le stesse in `dati/rose.csv`).

1. Copia `src/data/giornata.json` (per esempio in `dati/giornata-2.json`).
2. Aggiorna `giornata`, `classificaPrima` e i 4 `scontri` usando gli id delle squadre (`pan-fc`, `atletico-madrink`, …): punteggi e giocatori rilevanti (marcatori, assist, cartellini, rigori, voti disastrosi). Non serve inserire tutti gli 11 e non serve il ruolo, lo prende dalla rosa.
3. Lancia `npm run render:giornata -- dati/giornata-2.json`.

Presidenti, colori, aspetto degli avatar e tormentoni si cambiano una volta sola in `lega.json`.

## Personalizzare

| Cosa | Dove |
|---|---|
| Ritmo / durata delle scene | `src/lib/timeline.ts` |
| Frasi della telecronaca | `src/lib/telecronaca.ts` |
| Regole emozioni e tag | `src/lib/fanta.ts` |
| Colori e font | `src/theme.ts` |
| Foto giocatori | `public/giocatori/…` + campo `immagine` |
| Avatar allenatori PNG | `public/allenatori/<id>/<emozione>.png` + campo `immagini` |
