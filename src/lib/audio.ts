// Regia audio: quali suoni partono e quando, sincronizzati con le scene.
// I file sono in public/audio (generati da tools/genera_audio.py, tutti originali).
import type { AnalisiScontro, Evento } from "./fanta";
import { DUR, INIZIO_VOCE, type Segmento, type VoceScontro } from "./timeline";
import { CORSA, frameSoglie } from "../scenes/CorsaAlGol";

export interface Cue {
  file: string; // nome in public/audio
  from: number; // frame assoluto nel video
  volume: number;
  durata?: number; // frame (per i suoni in loop, es. macchina da scrivere)
  loop?: boolean;
  /** true = battuta della telecronaca (file già con percorso dentro public/) */
  voce?: boolean;
}

export const VOLUME_MUSICA = 0.42;

// durata in frame dell'effetto "macchina da scrivere" della barra telecronaca
const durataScrittura = (testo: string) => Math.ceil(testo.length / 1.6) + 6;

const suoniEvento = (e: Evento): [string, number, number][] => {
  // [file, frame relativo alla carta evento, volume]
  const base: [string, number, number][] = [["whoosh", 0, 0.35]];
  switch (e.tipo) {
    case "gol":
      return [...base, ["impatto", 8, 0.7], ["folla-gol", 9, 0.95]];
    case "rigoreParato":
      return [...base, ["impatto", 6, 0.5], ["folla-ooh", 8, 0.85]];
    case "rigoreSbagliato":
      return [...base, ["whoosh", 4, 0.6], ["buu", 14, 0.85]];
    case "rosso":
      return [...base, ["fischio", 6, 0.7], ["buu", 16, 0.45]];
    case "giallo":
      return [...base, ["fischio", 6, 0.5]];
    case "autogol":
      return [...base, ["buu", 10, 0.85]];
    case "disastro":
      return [...base, ["impatto", 10, 0.45], ["buu", 12, 0.7]];
  }
};

export const cueAudio = (
  a: AnalisiScontro,
  segmenti: Segmento[],
  frasi: { pre: string; mvp: string; verdetto: string },
  soglie: { base: number; passo: number },
  voce?: VoceScontro,
): Cue[] => {
  const at = (nome: Segmento["nome"]) => segmenti.find((s) => s.nome === nome)!.from;
  const c: Cue[] = [];
  const add = (file: string, from: number, volume: number, extra: Partial<Cue> = {}) =>
    // effetti a 0,85 per lasciare spazio alla voce ed evitare la saturazione quando si sommano
    c.push({ file, from: Math.max(0, Math.round(from)), volume: extra.voce ? volume : volume * 0.85, ...extra });

  // tagli tra le scene
  segmenti.slice(1).forEach((s) => add("whoosh", s.from - Math.floor(DUR.wipe / 2), 0.5));

  // intro: numero della giornata che "sbatte"
  add("whoosh", at("intro"), 0.55);
  add("impatto", at("intro") + 6, 0.9);

  // faccia a faccia: VS + telecronaca
  add("impatto", at("faceoff") + 24, 1);
  add("fischio", at("faceoff") + 34, 0.45);
  add("macchina", at("faceoff") + INIZIO_VOCE.faceoff, voce?.pre ? 0.15 : 0.5, { durata: durataScrittura(frasi.pre), loop: true });
  if (voce?.pre) add(voce.pre.file, at("faceoff") + INIZIO_VOCE.faceoff, 1, { durata: voce.pre.frames + 10, voce: true });

  // momenti chiave
  a.eventi.forEach((e, i) => {
    const t0 = at("momenti") + i * DUR.evento;
    suoniEvento(e).forEach(([f, dt, v]) => add(f, t0 + dt, v));
  });

  // corsa al gol: un "ding" per ogni soglia superata
  for (const lato of [a.casa, a.trasferta]) {
    frameSoglie(lato.punteggio, soglie).forEach((f) => add("ding", at("scoreRace") + f, 0.45));
  }
  add("impatto", at("scoreRace") + CORSA.END + 6, 0.6);

  // uomo partita
  add("scintille", at("mvp") + 4, 0.8);
  add("folla-applauso", at("mvp") + 10, 0.55);
  add("macchina", at("mvp") + INIZIO_VOCE.mvp, voce?.mvp ? 0.15 : 0.5, { durata: durataScrittura(frasi.mvp), loop: true });
  if (voce?.mvp) add(voce.mvp.file, at("mvp") + INIZIO_VOCE.mvp, 1, { durata: voce.mvp.frames + 10, voce: true });

  // verdetto
  add("fischio-finale", at("verdetto"), 0.7);
  add("impatto", at("verdetto") + 10, 0.85);
  if (a.vincitore) add(a.verdetto === "goleada" ? "folla-gol" : "folla-applauso", at("verdetto") + 14, 0.85);
  else add("folla-ooh", at("verdetto") + 14, 0.6);
  add("macchina", at("verdetto") + INIZIO_VOCE.verdetto, voce?.verdetto ? 0.15 : 0.5, { durata: durataScrittura(frasi.verdetto), loop: true });
  if (voce?.verdetto) add(voce.verdetto.file, at("verdetto") + INIZIO_VOCE.verdetto, 1, { durata: voce.verdetto.frames + 10, voce: true });

  return c.sort((x, y) => x.from - y.from);
};

/** volume della musica di sottofondo frame per frame (fade in/out, abbassata durante i boati) */
export const volumeMusica = (f: number, totale: number, cues: Cue[]) => {
  const fadeIn = Math.min(1, f / 20);
  const fadeOut = Math.min(1, Math.max(0, (totale - f) / 45));
  const boato = cues.some((c) => c.file.startsWith("folla") && f >= c.from && f < c.from + 50);
  // mentre parla il telecronista la musica scende (ducking morbido)
  const parla = cues.some((c) => c.voce && f >= c.from - 6 && f < c.from + (c.durata ?? 0));
  return VOLUME_MUSICA * fadeIn * fadeOut * (parla ? 0.35 : boato ? 0.6 : 1);
};
