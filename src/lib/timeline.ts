import type { Giornata } from "../data/types";
import { analizzaScontro } from "./fanta";

// Durate in frame (30 fps). Cambia qui il ritmo del video.
export const DUR = {
  intro: 75,
  faceoff: 135,
  evento: 57,
  scoreRace: 165,
  mvp: 105,
  verdetto: 200,
  wipe: 18,
};

export interface Segmento {
  nome: "intro" | "faceoff" | "momenti" | "scoreRace" | "mvp" | "verdetto";
  from: number;
  durata: number;
}

/** Battuta di telecronaca parlata (file in public/, durata in frame) */
export interface Battuta {
  file: string;
  frames: number;
}
export interface VoceScontro {
  pre?: Battuta;
  mvp?: Battuta;
  verdetto?: Battuta;
}

// frame (dall'inizio della scena) in cui parte la telecronaca
export const INIZIO_VOCE = { faceoff: 44, mvp: 30, verdetto: 40 };

export const calcolaTimeline = (g: Giornata, indice: number, voce?: VoceScontro) => {
  const a = analizzaScontro(g, indice);
  // se c'è la voce, la scena dura almeno quanto la battuta (+ un attimo di respiro)
  const conVoce = (base: number, inizio: number, b?: Battuta) => (b ? Math.max(base, inizio + b.frames + 20) : base);
  const durate: [Segmento["nome"], number][] = [
    ["intro", DUR.intro],
    ["faceoff", conVoce(DUR.faceoff, INIZIO_VOCE.faceoff, voce?.pre)],
    ["momenti", Math.max(1, a.eventi.length) * DUR.evento + 6],
    ["scoreRace", DUR.scoreRace],
    ["mvp", conVoce(DUR.mvp, INIZIO_VOCE.mvp, voce?.mvp)],
    ["verdetto", conVoce(DUR.verdetto, INIZIO_VOCE.verdetto, voce?.verdetto) ],
  ];
  let t = 0;
  const segmenti: Segmento[] = durate.map(([nome, durata]) => {
    const s = { nome, from: t, durata };
    t += durata;
    return s;
  });
  return { segmenti, totale: t, analisi: a };
};
