// Dati per il riepilogo di fine giornata (composizione "Risultati"): risultati + classifica prima/dopo.
const golDa = (pt, s = { base: 66, passo: 4 }) => (pt < s.base ? 0 : Math.floor((pt - s.base) / s.passo) + 1);
const gol = (g, sc) => [sc.golCasa ?? golDa(sc.punteggioCasa, g.soglie), sc.golTrasferta ?? golDa(sc.punteggioTrasferta, g.soglie)];

/** Classifica dopo le giornate passate (3 vittoria, 1 pari; a pari punti contano i fantapunti) */
export const classificaDa = (ids, giornate) => {
  const t = Object.fromEntries(ids.map((id) => [id, { id, punti: 0, fp: 0 }]));
  for (const g of giornate) {
    for (const sc of g.scontri || []) {
      if (!t[sc.casa] || !t[sc.trasferta]) continue;
      const [gc, gt] = gol(g, sc);
      t[sc.casa].fp += sc.punteggioCasa || 0;
      t[sc.trasferta].fp += sc.punteggioTrasferta || 0;
      if (gc > gt) t[sc.casa].punti += 3;
      else if (gc < gt) t[sc.trasferta].punti += 3;
      else { t[sc.casa].punti += 1; t[sc.trasferta].punti += 1; }
    }
  }
  return Object.values(t)
    .sort((a, b) => b.punti - a.punti || b.fp - a.fp)
    .map((x, i) => ({ ...x, fp: Math.round(x.fp * 10) / 10, posizione: i + 1 }));
};

/** props per <RisultatiGiornata>: g = giornata appena finita, prima = giornate precedenti */
export const datiRisultati = (lega, g, prima) => {
  const ids = lega.squadre.map((s) => s.id);
  const pre = Object.fromEntries(classificaDa(ids, prima).map((r) => [r.id, r]));
  const presi = {};
  const risultati = g.scontri.map((sc) => {
    const [gc, gt] = gol(g, sc);
    presi[sc.casa] = gc > gt ? 3 : gc === gt ? 1 : 0;
    presi[sc.trasferta] = gt > gc ? 3 : gc === gt ? 1 : 0;
    return { casa: sc.casa, trasferta: sc.trasferta, golCasa: gc, golTrasferta: gt, ptCasa: sc.punteggioCasa, ptTrasferta: sc.punteggioTrasferta };
  });
  const iniziata = prima.length > 0;
  const classifica = classificaDa(ids, [...prima, g]).map((r) => ({
    ...r,
    ...(iniziata ? { prima: pre[r.id]?.posizione } : {}),
    presi: presi[r.id],
  }));
  return { lega: lega.lega || "Ciempions Fig", giornata: g.giornata, risultati, classifica };
};
