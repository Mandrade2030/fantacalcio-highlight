# Locandina pre-giornata (Gemini)

Ogni settimana, prima che inizi la giornata, si genera una locandina caricaturale con i 4 scontri.

1. Scontri e classifica: https://leghe.fantacalcio.it/ciempions-fig/calendario (prossima giornata non ancora giocata) e classifica.
2. Apri https://gemini.google.com/app (account di Davide), carica `cast-presidenti.png` (le 8 caricature con il nome della squadra sotto).
3. Prompt (sostituisci giornata, scontri e le note di sfottò in base alla classifica):

```
Genera un'immagine. Usando i personaggi caricaturali dell'immagine allegata (ogni caricatura e' il presidente della squadra scritta sotto di lui), crea una LOCANDINA verticale formato 4:5 per presentare la giornata N della nostra lega di fantacalcio tra amici. Stile: poster da trasmissione sportiva, colori accesi, luci da stadio, divertente e caricaturale, clima da sfotto'. In alto un titolo grande: 'GIORNATA N' e sopra piu' piccolo 'CIEMPIONS FIG'. Sotto, 4 sfide in 4 fasce orizzontali; in ognuna i due presidenti uno di fronte all'altro, un grande 'VS' in mezzo e sotto ciascuno il nome della squadra scritto ESATTAMENTE cosi': 1) CASA vs TRASFERTA: <nota sfotto'> ... Mantieni i volti IDENTICI alle caricature fornite (stessi capelli, barba, occhiali, vestiti). Scritte nitide e corrette in italiano, solo il titolo e i nomi delle squadre, nessun altro testo.
```

Idee per le note: capolista con la corona; ultimo in classifica preoccupato e sudato; chi e' a 0 punti si consola con la birra; scontro diretto = fronte contro fronte da pugili; chi viene da una goleada subita con un cerotto in testa.

   Chiedi a Gemini SOLO titolo e nomi delle squadre (nessuna etichetta di classifica: le sbaglia).
4. Scarica l'immagine e aggiungi le etichette esatte di posizione e punti con
   `python tools/pregiornata/etichette.py grezza.jpg out/giornata-N/pregiornata.jpg '[["5","3"],["1","6"],...]'`
   (8 coppie [posizione, punti], ordine: sinistra/destra di ogni fascia dall'alto). 1° = etichetta oro, ultimo = rossa.
