import type {
  Allenatore,
  Emozione,
  Giocatore,
  Giornata,
  Scontro,
} from "../data/types";

export type Lato = "casa" | "trasferta";

export type TipoEvento =
  | "gol"
  | "rigoreParato"
  | "rigoreSbagliato"
  | "rosso"
  | "autogol"
  | "disastro"
  | "giallo";

export interface Evento {
  tipo: TipoEvento;
  lato: Lato;
  giocatore: Giocatore;
  quantita: number;
  assistDa?: string;
}

export interface Contendente {
  lato: Lato;
  allenatore: Allenatore;
  punteggio: number;
  gol: number;
  giocatori: Giocatore[];
  posizione: number; // posizione in classifica prima della giornata
  puntiClassifica: number;
  emozione: Emozione;
}

export type TipoVerdetto = "goleada" | "misura" | "netta" | "beffa" | "pari" | "pariSpettacolo";

export interface AnalisiScontro {
  indice: number;
  casa: Contendente;
  trasferta: Contendente;
  vincitore: Lato | null;
  verdetto: TipoVerdetto;
  /** tag finali (manuali + automatici), in ordine di importanza */
  tag: string[];
  titoloSfida: string;
  eventi: Evento[];
  mvp: { giocatore: Giocatore; lato: Lato };
  /** punti mancanti al gol successivo per lo sconfitto (per la "beffa") */
  mancavano: number;
  /** true a inizio stagione: classifica tutta a zero */
  classificaVuota: boolean;
}

// Ciempions Fig: 66 punti = 1 gol, poi +1 gol ogni 4 punti
const DEFAULT_SOGLIE = { base: 66, passo: 4 };

export const golDaPunteggio = (
  punteggio: number,
  soglie = DEFAULT_SOGLIE,
): number =>
  punteggio < soglie.base
    ? 0
    : Math.floor((punteggio - soglie.base) / soglie.passo) + 1;

export const sogliaSuccessiva = (punteggio: number, soglie = DEFAULT_SOGLIE) =>
  soglie.base + golDaPunteggio(punteggio, soglie) * soglie.passo;

export const getAllenatore = (g: Giornata, id: string): Allenatore => {
  const a = g.allenatori.find((x) => x.id === id);
  if (!a) throw new Error(`Allenatore "${id}" non trovato nei dati`);
  return a;
};

// Regole emozioni (modificale qui):
// vittoria -> esultanza | pari -> neutro | -1 -> rabbia | -2 -> tristezza | -3 o peggio -> pianto
const emozioneDa = (mieiGol: number, loroGol: number): Emozione => {
  const d = mieiGol - loroGol;
  if (d > 0) return "esultanza";
  if (d === 0) return "neutro";
  if (d <= -3) return "pianto";
  if (d === -1) return "rabbia";
  return "tristezza";
};

const PRIORITA: Record<TipoEvento, number> = {
  gol: 100,
  rigoreParato: 80,
  rosso: 70,
  autogol: 65,
  rigoreSbagliato: 60,
  disastro: 40,
  giallo: 10,
};

const estraiEventi = (lato: Lato, giocatori: Giocatore[]): Evento[] => {
  const ev: Evento[] = [];
  const assistmen = giocatori
    .filter((g) => (g.assist ?? 0) > 0)
    .flatMap((g) => Array.from({ length: g.assist ?? 0 }, () => g.nome));

  for (const g of giocatori) {
    const gol = g.gol ?? 0;
    if (gol > 0) {
      const idx = assistmen.findIndex((n) => n !== g.nome);
      const assistDa = idx >= 0 ? assistmen.splice(idx, 1)[0] : undefined;
      ev.push({ tipo: "gol", lato, giocatore: g, quantita: gol, assistDa });
    }
    if ((g.rigoreParato ?? 0) > 0)
      ev.push({ tipo: "rigoreParato", lato, giocatore: g, quantita: g.rigoreParato! });
    if (g.espulsione) ev.push({ tipo: "rosso", lato, giocatore: g, quantita: 1 });
    if ((g.autogol ?? 0) > 0)
      ev.push({ tipo: "autogol", lato, giocatore: g, quantita: g.autogol! });
    if ((g.rigoreSbagliato ?? 0) > 0)
      ev.push({ tipo: "rigoreSbagliato", lato, giocatore: g, quantita: g.rigoreSbagliato! });
    const giaCitato = ev.some((e) => e.giocatore === g);
    if (!giaCitato && g.voto !== null && g.voto <= 4.5)
      ev.push({ tipo: "disastro", lato, giocatore: g, quantita: 1 });
    if (g.ammonizione && !g.espulsione)
      ev.push({ tipo: "giallo", lato, giocatore: g, quantita: 1 });
  }
  return ev;
};

const peso = (e: Evento) => PRIORITA[e.tipo] + e.quantita * 5 + (e.giocatore.fantavoto ?? 0) * 0.1;

export const MAX_EVENTI = 6;

export const analizzaScontro = (g: Giornata, indice: number): AnalisiScontro => {
  const s: Scontro = g.scontri[indice];
  if (!s) throw new Error(`Scontro ${indice} inesistente`);
  const soglie = g.soglie ?? DEFAULT_SOGLIE;

  const classifica = [...g.classificaPrima].sort((a, b) => b.punti - a.punti);
  const posDi = (id: string) => classifica.findIndex((r) => r.allenatore === id) + 1;
  const puntiDi = (id: string) => classifica.find((r) => r.allenatore === id)?.punti ?? 0;

  const golC = s.golCasa ?? golDaPunteggio(s.punteggioCasa, soglie);
  const golT = s.golTrasferta ?? golDaPunteggio(s.punteggioTrasferta, soglie);
  const vincitore: Lato | null = golC > golT ? "casa" : golT > golC ? "trasferta" : null;

  const perdenteScore =
    vincitore === "casa" ? s.punteggioTrasferta : vincitore === "trasferta" ? s.punteggioCasa : 0;
  const mancavano = vincitore ? sogliaSuccessiva(perdenteScore, soglie) - perdenteScore : 0;
  const beffa = vincitore !== null && Math.abs(golC - golT) === 1 && mancavano <= 1.5;

  const diff = Math.abs(golC - golT);
  const verdetto: TipoVerdetto =
    vincitore === null
      ? golC >= 3
        ? "pariSpettacolo"
        : "pari"
      : diff >= 3
        ? "goleada"
        : beffa
          ? "beffa"
          : diff === 1
            ? "misura"
            : "netta";

  const mk = (lato: Lato): Contendente => {
    const id = lato === "casa" ? s.casa : s.trasferta;
    const mieiGol = lato === "casa" ? golC : golT;
    const loroGol = lato === "casa" ? golT : golC;
    return {
      lato,
      allenatore: getAllenatore(g, id),
      punteggio: lato === "casa" ? s.punteggioCasa : s.punteggioTrasferta,
      gol: mieiGol,
      giocatori: lato === "casa" ? s.formazioneCasa : s.formazioneTrasferta,
      posizione: posDi(id),
      puntiClassifica: puntiDi(id),
      emozione: emozioneDa(mieiGol, loroGol),
    };
  };
  const casa = mk("casa");
  const trasferta = mk("trasferta");
  // Colori troppo simili (es. due squadre rossonere): la trasferta usa il secondario
  if (distanzaColore(casa.allenatore.colori.primario, trasferta.allenatore.colori.primario) < 90) {
    const { primario, secondario } = trasferta.allenatore.colori;
    trasferta.allenatore = { ...trasferta.allenatore, colori: { primario: secondario, secondario: primario } };
  }
  const classificaVuota = classifica.every((r) => r.punti === classifica[0]?.punti);

  // Tag automatici dalla classifica
  const n = classifica.length;
  const tag = [...(s.tag ?? [])];
  if (!classificaVuota && casa.posizione <= 3 && trasferta.posizione <= 3) tag.push("vertice");
  if (!classificaVuota && casa.posizione > n - 3 && trasferta.posizione > n - 3) tag.push("salvezza");
  if (verdetto === "goleada") tag.push("goleada");

  const titoloSfida =
    s.nomeSfida ??
    (tag.includes("derby")
      ? "Il Derby"
      : tag.includes("vertice")
        ? "Scontro al vertice"
        : tag.includes("salvezza")
          ? "Lotta salvezza"
          : `Sfida ${indice + 1} di ${g.scontri.length}`);

  // Eventi: i più importanti, con il colpo più grosso del vincitore in chiusura
  const tutti = [
    ...estraiEventi("casa", casa.giocatori),
    ...estraiEventi("trasferta", trasferta.giocatori),
  ];
  const scelti = [...tutti].sort((a, b) => peso(b) - peso(a)).slice(0, MAX_EVENTI);
  const climax = scelti
    .filter((e) => e.tipo === "gol" && (vincitore === null || e.lato === vincitore))
    .sort((a, b) => peso(b) - peso(a))[0];
  const resto = scelti.filter((e) => e !== climax);
  // alterna i lati per dare ritmo, dal meno al più pesante
  resto.sort((a, b) => peso(a) - peso(b));
  const eventi = climax ? [...resto, climax] : resto;

  // MVP: miglior fantavoto dei due lati
  const candidati = [
    ...casa.giocatori.map((gg) => ({ giocatore: gg, lato: "casa" as Lato })),
    ...trasferta.giocatori.map((gg) => ({ giocatore: gg, lato: "trasferta" as Lato })),
  ];
  const mvp = candidati.sort(
    (a, b) =>
      (b.giocatore.fantavoto ?? 0) - (a.giocatore.fantavoto ?? 0) ||
      (b.giocatore.gol ?? 0) - (a.giocatore.gol ?? 0),
  )[0];

  return {
    indice,
    casa,
    trasferta,
    vincitore,
    verdetto,
    tag,
    titoloSfida,
    eventi,
    mvp,
    mancavano: Math.round(mancavano * 10) / 10,
    classificaVuota,
  };
};

export const formatVoto = (v: number | null) =>
  v === null ? "s.v." : Number.isInteger(v) ? `${v}` : v.toFixed(1).replace(".", ",");

// I nomi possono essere "Lautaro Martinez" oppure nel formato fantacalcio.it "Martinez L."
const parti = (nome: string) => {
  const p = nome.split(/\s+/).filter(Boolean);
  const iniz = p.filter((x) => /^([A-Za-zÀ-ÿ]\.)+$/.test(x));
  const resto = p.filter((x) => !iniz.includes(x));
  return { iniz, resto, formatoFanta: iniz.length > 0 };
};

export const cognome = (nome: string) => {
  const { resto, formatoFanta } = parti(nome);
  // "Martinez L." -> "Martinez"; "De Bruyne", "Kolo Muani" restano interi
  return formatoFanta ? resto.join(" ") : nome;
};

export const iniziali = (nome: string) => {
  const { iniz, resto, formatoFanta } = parti(nome);
  if (formatoFanta) return (iniz[0][0] + resto[0][0]).toUpperCase();
  if (resto.length === 1) return resto[0].slice(0, 3).toUpperCase();
  return (resto[0][0] + resto[resto.length - 1][0]).toUpperCase();
};

const distanzaColore = (a: string, b: string) => {
  const rgb = (h: string) => {
    const n = parseInt(h.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
