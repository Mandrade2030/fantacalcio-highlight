import type { AnalisiScontro } from "./fanta";
import { cognome, formatVoto } from "./fanta";

// Generatore deterministico: stessa giornata -> stesse frasi (il render è ripetibile).
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
export const scegli = <T,>(arr: T[], seme: string): T => arr[hash(seme) % arr.length];

const riempi = (t: string, v: Record<string, string>) =>
  t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? `{${k}}`);

const PRE_PARTITA: Record<string, string[]> = {
  derby: [
    "È il derby: qui non si gioca per i tre punti, si gioca per lo sfottò del lunedì.",
    "Derby! Chi perde stasera non apre il gruppo WhatsApp per una settimana.",
  ],
  vertice: [
    "Scontro al vertice: {casa} e {trasferta} si giocano la vetta.",
    "Prima contro seconda, o quasi. Chi vince guarda tutti dall'alto.",
  ],
  salvezza: [
    "Lotta salvezza: chi perde stasera paga la pizza.",
    "Bassa classifica, alta tensione. Qui ogni mezzo voto pesa come un macigno.",
  ],
  normale: [
    "{casa} contro {trasferta}. Si parte!",
    "Fischio d'inizio: {casa} ospita {trasferta}.",
    "Occhi puntati su {casa} - {trasferta}.",
  ],
};

const VERDETTO: Record<string, string[]> = {
  goleada: [
    "{V} non fa prigionieri: {score}. {P}, è ora di cambiare modulo. O hobby.",
    "Manita o quasi: {V} travolge {P}. Qualcuno chiami un dottore.",
  ],
  misura: [
    "{V} la porta a casa di misura. {P} mastica amaro.",
    "Basta un gol di scarto: {V} vince, {P} recrimina.",
  ],
  netta: [
    "Vittoria netta per {V}. {P}, serata da dimenticare.",
    "{V} controlla e chiude {score}. Nessuna discussione.",
  ],
  beffa: [
    "Beffa atroce per {P}: mancavano {mancavano} punti al gol. {V} ringrazia.",
    "Mezzo voto. Tanto è mancato a {P}. {V} vince e se la ride.",
  ],
  pari: [
    "{score}, pari e patta. Nessuno ride, nessuno piange.",
    "Un punto a testa e tutti a casa. Che noia, però.",
  ],
  pariSpettacolo: [
    "Spettacolo puro: {score}! Nessuno vince, ma che partita.",
    "Pioggia di gol e alla fine è {score}. Applausi a entrambi.",
  ],
};

const MVP = [
  "{giocatore} trascina {squadra}: fantavoto {fv}.",
  "Uomo partita: {giocatore}. {fv} di fantavoto, e chi lo ferma?",
  "{giocatore} prende la partita e se la porta a casa: {fv}.",
];

const tagPrincipale = (a: AnalisiScontro) =>
  a.tag.includes("derby")
    ? "derby"
    : a.tag.includes("vertice")
      ? "vertice"
      : a.tag.includes("salvezza")
        ? "salvezza"
        : "normale";

export const frasePrePartita = (a: AnalisiScontro, seme: string) =>
  riempi(scegli(PRE_PARTITA[tagPrincipale(a)], seme + "pre"), {
    casa: a.casa.allenatore.squadra,
    trasferta: a.trasferta.allenatore.squadra,
  });

export const fraseVerdetto = (a: AnalisiScontro, seme: string) => {
  const V = a.vincitore === "trasferta" ? a.trasferta : a.casa;
  const P = a.vincitore === "trasferta" ? a.casa : a.trasferta;
  let frase = riempi(scegli(VERDETTO[a.verdetto], seme + "ver"), {
    V: V.allenatore.nome,
    P: P.allenatore.nome,
    score: `${a.casa.gol}-${a.trasferta.gol}`,
    mancavano: formatVoto(a.mancavano),
  });
  if (a.vincitore) {
    const extraV = V.allenatore.tormentoni?.quandoVince;
    const extraP = P.allenatore.tormentoni?.quandoPerde;
    const extra = extraP?.length ? scegli(extraP, seme + "tp") : extraV?.length ? scegli(extraV, seme + "tv") : null;
    if (extra) frase = `${frase} ${extra}`;
  }
  return frase;
};

export const fraseMvp = (a: AnalisiScontro, seme: string) => {
  const squadra = (a.mvp.lato === "casa" ? a.casa : a.trasferta).allenatore.squadra;
  return riempi(scegli(MVP, seme + "mvp"), {
    giocatore: cognome(a.mvp.giocatore.nome),
    squadra,
    fv: formatVoto(a.mvp.giocatore.fantavoto),
  });
};

export const ETICHETTA_TAG: Record<string, string> = {
  derby: "DERBY",
  vertice: "SCONTRO AL VERTICE",
  salvezza: "LOTTA SALVEZZA",
  goleada: "GOLEADA",
};
