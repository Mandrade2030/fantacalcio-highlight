// Messaggi del bot WhatsApp per "fomentare" il gruppo prima della giornata.
// Deterministici: stessa giornata = stessi messaggi (la variante si sceglie con un hash, niente Math.random).

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const scegli = (lista, seme) => lista[hash(seme) % lista.length];

/**
 * @param pre  dati pre-giornata ({giornata, sfide:[{casa, trasferta}]}, lati con id, posizione, punti, stelle)
 * @param lega lega.json
 * @returns passi da mandare in ordine: { testo } oppure { file, testo } (file relativo a out/)
 */
export const messaggiPregiornata = (pre, lega) => {
  const n = pre.giornata;
  const sq = (id) => lega.squadre.find((s) => s.id === id) || { nome: id, presidente: id };
  const cap = (l) => (l.stelle || []).find((s) => s.capitano)?.nome || (l.stelle || [])[0]?.nome;
  const tot = lega.squadre.length;
  const conClassifica = pre.sfide.some((s) => (s.casa.punti || 0) + (s.trasferta.punti || 0) > 0);

  const apertura = scegli(
    [
      `🚨 *GIORNATA ${n}* 🚨\nSi riaccendono i riflettori sulla Ciempions Fig. Formazioni chiuse, niente più scuse: da adesso parla solo il campo. ⚽🔥`,
      `📣 *ATTENZIONE ATTENZIONE* 📣\nÈ arrivata la *giornata ${n}*. Chi ha schierato il titolare giusto dorme sereno, gli altri inizino pure a pregare. 🙏⚽`,
      `🔥 *GIORNATA ${n}: SI GIOCA* 🔥\nQuattro scontri, otto presidenti, un solo gruppo dove nascondersi dopo la sconfitta: questo. 😏`,
    ],
    `apertura-${n}`,
  );

  const riga = (s, i) => {
    const A = sq(s.casa.id), B = sq(s.trasferta.id);
    const pa = s.casa.posizione, pb = s.trasferta.posizione;
    const titolo = `*${A.nome}* 🆚 *${B.nome}*`;
    const capitani = `©️ ${cap(s.casa)} vs ${cap(s.trasferta)}`;
    let frase;
    if (!conClassifica || pa == null || pb == null) {
      frase = scegli([`Mister ${A.presidente} contro Mister ${B.presidente}: si parte da zero, ma qualcuno ci resterà.`, `Prima pagina tutta da scrivere: chi sbaglia la formazione finisce nel meme della settimana.`], `${n}-${i}`);
    } else {
      const capolista = pa === 1 ? A : pb === 1 ? B : null;
      const sfidante = pa === 1 ? B : A;
      const ultimo = pa === tot ? A : pb === tot ? B : null;
      if (pa <= 3 && pb <= 3) frase = `🔝 *Scontro al vertice*: ${pa}° contro ${pb}°. Chi vince mette le mani sulla classifica, chi perde guarda gli altri dall'alto… del secondo piano.`;
      else if (pa > tot - 3 && pb > tot - 3) frase = `🆘 *Lotta salvezza*: ${pa}° contro ${pb}°. Partita da brividi, ma solo perché fa paura guardare la classifica.`;
      else if (capolista)
        frase = scegli(
          [
            `👑 ${capolista.nome} arriva da *capolista*: Mister ${sfidante.presidente}, è il momento di rovinare la festa a Mister ${capolista.presidente}.`,
            `👑 Tutti contro la *capolista* ${capolista.nome}. Mister ${sfidante.presidente} ha in mano la fionda: Golia è avvisato.`,
          ],
          `${n}-${i}-c`,
        );
      else if (ultimo)
        frase = scegli(
          [
            `🪫 ${ultimo.nome} è *ultima* con ${ultimo === A ? s.casa.punti : s.trasferta.punti} punti: Mister ${ultimo.presidente}, se non ora quando?`,
            `📉 Mister ${ultimo.presidente} guarda tutti dal basso. Una vittoria qui e il gruppo smette di ridere (forse).`,
          ],
          `${n}-${i}-u`,
        );
      else if ((s.casa.punti || 0) === 0 || (s.trasferta.punti || 0) === 0) {
        const z = (s.casa.punti || 0) === 0 ? A : B;
        frase = `🥚 ${z.nome} ancora a *zero punti*: Mister ${z.presidente}, il gruppo ha già pronto lo sticker. Smentiscilo.`;
      } else {
        const d = Math.abs((s.casa.punti || 0) - (s.trasferta.punti || 0));
        frase = `⚖️ ${pa}° contro ${pb}°, ${d === 0 ? "appaiate in classifica" : d === 1 ? "un solo punto di distanza" : `${d} punti di distanza`}. Partita da tripla: si decide sul filo dei mezzi voti.`;
      }
    }
    return `${titolo}\n${frase}\n${capitani}`;
  };

  const sfide = `🗓 *Il programma della giornata ${n}*\n\n${pre.sfide.map(riga).join("\n\n")}`;
  const chiusura = scegli(
    [
      `A fine giornata arrivano gli *highlight*: chi vince finisce in copertina, chi perde finisce… in copertina lo stesso, ma per altri motivi. 📺😂`,
      `Appuntamento a fine giornata con gli *highlight* e la telecronaca. Preparate le scuse migliori, ne serviranno almeno quattro. 🎙️`,
    ],
    `chiusura-${n}`,
  );

  return [
    { testo: apertura },
    { file: `giornata-${n}/copertina-giornata-${n}.png`, testo: `Ecco il menù della *giornata ${n}* 👇` },
    { testo: sfide },
    { testo: chiusura },
  ];
};
