// Modello dati di una giornata. È l'unico input del video:
// stesso JSON -> stesso video.

export type Ruolo = "P" | "D" | "C" | "A";

export type Emozione =
  | "neutro"
  | "esultanza"
  | "tristezza"
  | "pianto"
  | "rabbia"
  | "grinta";

export interface Giocatore {
  nome: string;
  ruolo: Ruolo;
  voto: number | null; // null = senza voto (s.v.)
  fantavoto: number | null;
  gol?: number;
  assist?: number;
  ammonizione?: boolean;
  espulsione?: boolean;
  rigoreSegnato?: number;
  rigoreSbagliato?: number;
  rigoreParato?: number;
  golSubiti?: number;
  autogol?: number;
  /** percorso dentro /public (es. "giocatori/lautaro.png") oppure URL */
  immagine?: string;
}

/** Aspetto dell'avatar disegnato in SVG (usato finché non ci sono i PNG personalizzati) */
export interface StileAvatar {
  pelle: string;
  capelli: string;
  acconciatura: "corti" | "ricci" | "pelato" | "cresta" | "lunghi" | "rasati";
  barba?: "nessuna" | "corta" | "folta" | "baffi";
  occhiali?: boolean;
}

export interface Allenatore {
  id: string;
  nome: string;
  squadra: string;
  /** 3 lettere, tipo tabellone TV */
  sigla: string;
  /** stemma della squadra dentro /public (es. "loghi/pan-fc.png") */
  logo?: string;
  colori: { primario: string; secondario: string };
  avatar: StileAvatar;
  /**
   * Quando avrete gli avatar veri: un PNG trasparente per emozione dentro /public,
   * es. { "esultanza": "allenatori/davide/esultanza.png" }.
   * Se manca un'emozione si usa l'avatar SVG.
   */
  immagini?: Partial<Record<Emozione, string>>;
  /** frasi/sfottò personalizzati usati dalla telecronaca */
  tormentoni?: { quandoVince?: string[]; quandoPerde?: string[] };
}

export interface Scontro {
  casa: string; // id allenatore
  trasferta: string;
  punteggioCasa: number;
  punteggioTrasferta: number;
  /** se omessi vengono calcolati dalle soglie */
  golCasa?: number;
  golTrasferta?: number;
  /** tag manuali, es. ["derby"]. "vertice" e "salvezza" vengono calcolati dalla classifica */
  tag?: string[];
  /** nome personalizzato della sfida, es. "Il Derby del Bar Sport" */
  nomeSfida?: string;
  formazioneCasa: Giocatore[];
  formazioneTrasferta: Giocatore[];
}

export interface RigaClassifica {
  allenatore: string;
  punti: number;
}

export interface Giornata {
  lega: string;
  stagione: string;
  giornata: number;
  /** soglie gol: base 66, +6 per ogni gol successivo */
  soglie?: { base: number; passo: number };
  allenatori: Allenatore[];
  scontri: Scontro[];
  /** classifica PRIMA della giornata (serve per i tag vertice/salvezza) */
  classificaPrima: RigaClassifica[];
}

/* ---------- Database della lega (src/data/lega.json) ---------- */

export interface GiocatoreRosa {
  nome: string; // come appare su fantacalcio.it (es. "Martinez L.")
  ruolo: Ruolo;
  costo: number; // crediti spesi all'asta
  immagine?: string;
}

export interface Squadra {
  id: string;
  nome: string;
  sigla: string;
  presidente: string; // nome dell'allenatore mostrato nei video
  logo?: string; // es. "loghi/pan-fc.png" dentro /public
  colori: { primario: string; secondario: string };
  creditiResidui: number;
  avatar: StileAvatar;
  immagini?: Partial<Record<Emozione, string>>;
  tormentoni?: { quandoVince?: string[]; quandoPerde?: string[] };
  rosa: GiocatoreRosa[];
}

export interface Lega {
  lega: string;
  competizione: string;
  budget: number;
  aggiornato: string;
  squadre: Squadra[];
}

/** Giocatore come lo inserisci nella giornata: il ruolo si ricava dalla rosa */
export type GiocatoreInput = Omit<Giocatore, "ruolo"> & { ruolo?: Ruolo };

export interface ScontroInput extends Omit<Scontro, "formazioneCasa" | "formazioneTrasferta"> {
  formazioneCasa: GiocatoreInput[];
  formazioneTrasferta: GiocatoreInput[];
}

/** Il file della giornata: le squadre arrivano da lega.json, qui solo i risultati */
export interface GiornataInput {
  giornata: number;
  stagione?: string;
  soglie?: { base: number; passo: number };
  scontri: ScontroInput[];
  /** se omessa o tutta a zero: niente tag vertice/salvezza */
  classificaPrima?: RigaClassifica[];
}
