import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Sfondo, Taglio, Testata } from "../components/Grafica";
import type { Giornata, GiornataInput } from "../data/types";
import { preparaGiornata } from "../lib/lega";
import { fraseMvp, fraseVerdetto, frasePrePartita } from "../lib/telecronaca";
import { DUR, calcolaTimeline, type VoceScontro } from "../lib/timeline";
import { cueAudio, volumeMusica } from "../lib/audio";
import { CorsaAlGol } from "../scenes/CorsaAlGol";
import { FaceOff } from "../scenes/FaceOff";
import { Intro } from "../scenes/Intro";
import { Momenti } from "../scenes/Momenti";
import { UomoPartita } from "../scenes/UomoPartita";
import { Verdetto } from "../scenes/Verdetto";

export interface HighlightProps {
  giornata: Giornata | GiornataInput;
  indice: number;
  /** false = video muto (utile per provare solo la grafica) */
  audio?: boolean;
  /** telecronaca parlata per scontro (generata dall'app con ElevenLabs), chiave = indice scontro */
  voci?: Record<string, VoceScontro>;
  [key: string]: unknown;
}

export const Highlight: React.FC<HighlightProps> = ({ giornata: input, indice, audio = true, voci }) => {
  const g = preparaGiornata(input);
  const voce = audio ? voci?.[String(indice)] : undefined;
  const { segmenti, analisi: a, totale } = calcolaTimeline(g, indice, voce);
  const seme = `${g.stagione}-${g.giornata}-${indice}`;
  const colA = a.casa.allenatore.colori.primario;
  const colB = a.trasferta.allenatore.colori.primario;
  const soglie = g.soglie ?? { base: 66, passo: 4 };
  const frasi = { pre: frasePrePartita(a, seme), mvp: fraseMvp(a, seme), verdetto: fraseVerdetto(a, seme) };
  const cues = audio ? cueAudio(a, segmenti, frasi, soglie, voce) : [];

  const scena = (nome: string) => {
    switch (nome) {
      case "intro":
        return <Intro a={a} giornata={g.giornata} lega={g.lega} />;
      case "faceoff":
        return <FaceOff a={a} frase={frasi.pre} />;
      case "momenti":
        return <Momenti a={a} />;
      case "scoreRace":
        return <CorsaAlGol a={a} soglie={soglie} />;
      case "mvp":
        return <UomoPartita a={a} frase={frasi.mvp} />;
      case "verdetto":
        return <Verdetto a={a} frase={frasi.verdetto} lega={g.lega} giornata={g.giornata} />;
    }
    return null;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#06070D" }}>
      <Sfondo colA={colA} colB={colB} />
      {segmenti.map((s) => (
        <Sequence key={s.nome} from={s.from} durationInFrames={s.durata} name={s.nome}>
          {scena(s.nome)}
          {s.nome !== "intro" && <Testata lega={g.lega} giornata={g.giornata} titolo={a.titoloSfida} />}
        </Sequence>
      ))}
      {/* audio: musica di sottofondo + effetti sincronizzati (vedi lib/audio.ts) */}
      {audio && <Audio src={staticFile("audio/musica.mp3")} volume={(f) => volumeMusica(f, totale, cues)} />}
      {cues.map((c, i) => (
        <Sequence key={`a-${i}`} from={c.from} durationInFrames={c.durata ?? 150} name={`♪ ${c.file}`} layout="none">
          <Audio src={staticFile(c.voce ? c.file : `audio/${c.file}.mp3`)} volume={c.volume} loop={c.loop} />
        </Sequence>
      ))}
      {/* tagli diagonali a cavallo dei cambi scena */}
      {segmenti.slice(1).map((s) => (
        <Sequence key={`w-${s.nome}`} from={s.from - Math.floor(DUR.wipe / 2)} durationInFrames={DUR.wipe} name={`taglio ${s.nome}`}>
          <Taglio colA={colA} colB={colB} durata={DUR.wipe} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
