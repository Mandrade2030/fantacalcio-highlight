// Messaggi del bot WhatsApp per "fomentare" il gruppo prima della giornata.
// Deterministici: stessa giornata = stessi messaggi (la variante si sceglie con un hash, niente Math.random).

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const scegli = (lista, seme) => lista[hash(seme) % lista.length];
/** nome con cui chiamarlo nel gruppo (nome vero dal profilo, se c'è) */
const chi = (S) => S.persona?.nome || S.presidente;
/** una battuta personale del profilo (pre / vince / perde), o null */
const battuta = (S, tipo, seme) => (S.persona?.[tipo]?.length ? scegli(S.persona[tipo], `${seme}-${S.id}-${tipo}`) : null);
const norm = (x) => String(x).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
      frase = scegli([`${chi(A)} contro ${chi(B)}: si parte da zero, ma qualcuno ci resterà.`, `Prima pagina tutta da scrivere: chi sbaglia la formazione finisce nel meme della settimana.`], `${n}-${i}`);
    } else {
      const capolista = pa === 1 ? A : pb === 1 ? B : null;
      const sfidante = pa === 1 ? B : A;
      const ultimo = pa === tot ? A : pb === tot ? B : null;
      if (pa <= 3 && pb <= 3) frase = `🔝 *Scontro al vertice*: ${pa}° contro ${pb}°. Chi vince mette le mani sulla classifica, chi perde guarda gli altri dall'alto… del secondo piano.`;
      else if (pa > tot - 3 && pb > tot - 3) frase = `🆘 *Lotta salvezza*: ${pa}° contro ${pb}°. Partita da brividi, ma solo perché fa paura guardare la classifica.`;
      else if (capolista)
        frase = scegli(
          [
            `👑 ${capolista.nome} arriva da *capolista*: ${chi(sfidante)}, è il momento di rovinare la festa a ${chi(capolista)}.`,
            `👑 Tutti contro la *capolista* ${capolista.nome}. ${chi(sfidante)} ha in mano la fionda: Golia è avvisato.`,
          ],
          `${n}-${i}-c`,
        );
      else if (ultimo)
        frase = scegli(
          [
            `🪫 ${ultimo.nome} è *ultima* con ${ultimo === A ? s.casa.punti : s.trasferta.punti} punti: ${chi(ultimo)}, se non ora quando?`,
            `📉 ${chi(ultimo)} guarda tutti dal basso. Una vittoria qui e il gruppo smette di ridere (forse).`,
          ],
          `${n}-${i}-u`,
        );
      else if ((s.casa.punti || 0) === 0 || (s.trasferta.punti || 0) === 0) {
        const z = (s.casa.punti || 0) === 0 ? A : B;
        frase = `🥚 ${z.nome} ancora a *zero punti*: ${chi(z)}, il gruppo ha già pronto lo sticker. Smentiscilo.`;
      } else {
        const d = Math.abs((s.casa.punti || 0) - (s.trasferta.punti || 0));
        frase = `⚖️ ${pa}° contro ${pb}°, ${d === 0 ? "appaiate in classifica" : d === 1 ? "un solo punto di distanza" : `${d} punti di distanza`}. Partita da tripla: si decide sul filo dei mezzi voti.`;
      }
    }
    const pers = [battuta(A, "pre", n), battuta(B, "pre", n)].filter(Boolean).map((t) => `• ${t}`);
    return [titolo, frase, ...pers, capitani].join("\n");
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

const fp = (n) => String(Math.round(n * 10) / 10).replace(".", ",");

/**
 * Messaggi di fine giornata: apertura, riepilogo risultati+classifica, i 4 highlight con commento, chiusura con top e flop.
 * @param ris  props della composizione Risultati (app/risultati.mjs → datiRisultati)
 * @param lega lega.json
 * @param conVideo se false salta gli highlight (es. non ancora generati)
 */
export const messaggiFineGiornata = (ris, lega, conVideo = true, giornata = null) => {
  const n = ris.giornata;
  const sq = (id) => lega.squadre.find((s) => s.id === id) || { nome: id, presidente: id };
  const r = ris.risultati;
  const scarto = (x) => Math.abs(x.golCasa - x.golTrasferta);
  const piuLarga = [...r].sort((a, b) => scarto(b) - scarto(a))[0];

  const titolo = scegli(
    [`🏁 *GIORNATA ${n}: FISCHIO FINALE* 🏁`, `📺 *GIORNATA ${n} IN ARCHIVIO* 📺`, `🔔 *TRIPLICE FISCHIO SULLA GIORNATA ${n}* 🔔`],
    `fine-${n}`,
  );
  const v = sq(piuLarga.golCasa >= piuLarga.golTrasferta ? piuLarga.casa : piuLarga.trasferta);
  const p = sq(piuLarga.golCasa >= piuLarga.golTrasferta ? piuLarga.trasferta : piuLarga.casa);
  const apertura =
    scarto(piuLarga) >= 3
      ? `${titolo}\nLa notizia del giorno: *${v.nome}* ne fa ${Math.max(piuLarga.golCasa, piuLarga.golTrasferta)} a *${p.nome}*. ${chi(p)}, spegni il telefono. 📵`
      : `${titolo}\nRisultati, classifica e highlight: è il momento della verità. Chi ha vinto si prepari a vantarsene, chi ha perso a leggere. 😏`;

  // i "pupilli" del presidente (es. il dio Krstovic): una riga se brillano (gol o fantavoto ≥ 8) o se affondano (≤ 5)
  const pupilli = (S, formazione) => {
    const out = [];
    for (const nome of S.persona?.pupilli || []) {
      const g = (formazione || []).find((p) => norm(p.nome) === norm(nome));
      if (!g || g.fantavoto == null) continue;
      const giocatore = nome.replace(/ [A-Z]\.$/, "");
      const t = g.gol > 0 || g.fantavoto >= 8 ? S.persona.pupilloTop : g.fantavoto <= 5 ? S.persona.pupilloFlop : null;
      if (t) out.push(t.replace("{giocatore}", giocatore).replace("{fv}", fp(g.fantavoto)));
    }
    return out;
  };

  const commento = (x, i) => {
    const A = sq(x.casa), B = sq(x.trasferta);
    const casaVince = x.golCasa > x.golTrasferta;
    const W = casaVince ? A : B, L = casaVince ? B : A;
    const ptL = casaVince ? x.ptTrasferta : x.ptCasa;
    const d = scarto(x);
    const seme = `${n}-${i}`;
    let frase;
    if (d === 0)
      frase = x.golCasa >= 3
        ? `Pari spettacolo: ${x.golCasa} gol a testa e nessuno che vuole offrire da bere. 🍻`
        : scegli([`Pareggio: ${chi(A)} e ${chi(B)} si stringono la mano (a denti stretti). 🤝`, `Un punto a testa, zero soddisfazioni. 😐`], seme);
    else if (d >= 3) frase = scegli([`Goleada di *${W.nome}*. ${chi(L)}, ci sono partite da dimenticare: questa è una di quelle. 🧹`, `*${W.nome}* passa come un treno. ${L.nome} ancora sta cercando il pallone. 🚂`], seme);
    else if (d === 1 && (ptL < 66 ? 66 - ptL : 4 - ((ptL - 66) % 4)) <= 1.5) frase = `*${W.nome}* la porta a casa di misura. Beffa per ${chi(L)}: mezzo voto in più e cambiava tutto. 🫠`;
    else if (d === 1) frase = scegli([`Vittoria di misura per *${W.nome}*: cuore, sudore e un pizzico di fortuna. 💪`, `*${W.nome}* soffre ma vince. ${chi(L)} recrimina, ma il tabellone non ascolta. 📋`], seme);
    else frase = scegli([`*${W.nome}* vince netto. ${chi(W)} ringrazia, ${chi(L)} riflette. 🤔`, `Partita senza storia: *${W.nome}* comanda, ${L.nome} subisce. ✅`], seme);
    const righe = [`*${A.nome}* ${x.golCasa}-${x.golTrasferta} *${B.nome}* (${fp(x.ptCasa)} - ${fp(x.ptTrasferta)})`, frase];
    // se un pupillo ha fatto notizia, parla lui al posto della battuta generica (niente "il dio Krstovic ha parlato" quando ha preso 5)
    const pup = { [A.id]: pupilli(A, giornata?.scontri?.[i]?.formazioneCasa), [B.id]: pupilli(B, giornata?.scontri?.[i]?.formazioneTrasferta) };
    if (d > 0) righe.push(...[pup[W.id].length ? null : battuta(W, "vince", seme), pup[L.id].length ? null : battuta(L, "perde", seme)].filter(Boolean).map((t) => `• ${t}`));
    righe.push(...pup[A.id], ...pup[B.id]);
    return righe.join("\n");
  };

  const tutti = r.flatMap((x) => [{ id: x.casa, pt: x.ptCasa }, { id: x.trasferta, pt: x.ptTrasferta }]).sort((a, b) => b.pt - a.pt);
  const top = tutti[0], flop = tutti[tutti.length - 1];
  const cl = [...ris.classifica].sort((a, b) => a.posizione - b.posizione);
  const capo = cl[0], ultimo = cl[cl.length - 1];
  const chiusura =
    `🔝 *Top della giornata*: ${sq(top.id).nome} con ${fp(top.pt)} fantapunti. ${chi(sq(top.id))}, offri tu.\n` +
    `🥄 *Cucchiaio di legno*: ${sq(flop.id).nome} con ${fp(flop.pt)}. ${chi(sq(flop.id))}, la formazione la fa il gatto?\n\n` +
    `👑 In vetta c'è *${sq(capo.id).nome}* (${capo.punti} pt)${capo.prima === 1 ? ", ancora lì" : capo.prima ? `, che sale dal ${capo.prima}° posto` : ""}. ` +
    `In fondo *${sq(ultimo.id).nome}* (${ultimo.punti} pt). Prossima giornata, nuove scuse. ⚽`;

  const passi = [{ testo: apertura }, { file: `giornata-${n}/risultati-giornata-${n}.png`, testo: `Risultati e classifica dopo la *giornata ${n}* 👇` }];
  r.forEach((x, i) => {
    const testo = commento(x, i);
    passi.push(conVideo ? { file: `giornata-${n}/highlight-${i + 1}-${x.casa}-vs-${x.trasferta}.mp4`, testo } : { testo });
  });
  passi.push({ testo: chiusura });
  return passi;
};
