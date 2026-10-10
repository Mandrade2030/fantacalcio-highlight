import React from "react";
import { Composition, Still } from "remotion";
import { Highlight, type HighlightProps } from "./compositions/Highlight";
import { Locandina, type LocandinaProps } from "./compositions/Locandina";
import { Sfida, type SfidaProps } from "./compositions/Sfida";
import { CopertinaGiornata, type CopertinaProps } from "./compositions/CopertinaGiornata";
import preGiornata from "../dati/pregiornata-3.json";
import datiGiornata from "./data/giornata.json";
import type { GiornataInput } from "./data/types";
import { preparaGiornata } from "./lib/lega";
import { calcolaTimeline } from "./lib/timeline";
import { FPS, H, W } from "./theme";

// giornata.json contiene solo i risultati; squadre e rose arrivano da lega.json
const giornata = datiGiornata as unknown as GiornataInput;
const completa = preparaGiornata(giornata);

// Per ogni scontro registriamo:
//  - Highlight-N      video verticale 1080x1920
//  - Locandina-N      poster col risultato (copertina del video)
//  - Presentazione-N  poster pre-partita
// I dati si possono sostituire al render con --props=percorso/giornata.json
// (vedi scripts/render-giornata.mjs).

export const RemotionRoot: React.FC = () => (
  <>
    {completa.scontri.map((_, i) => (
      <React.Fragment key={i}>
        <Composition<any, HighlightProps>
          id={`Highlight-${i + 1}`}
          component={Highlight}
          width={W}
          height={H}
          fps={FPS}
          durationInFrames={calcolaTimeline(completa, i).totale}
          defaultProps={{ giornata, indice: i }}
          calculateMetadata={({ props }) => ({
            durationInFrames: calcolaTimeline(preparaGiornata(props.giornata), props.indice, props.voci?.[String(props.indice)]).totale,
          })}
        />
        <Still<any, LocandinaProps>
          id={`Locandina-${i + 1}`}
          component={Locandina}
          width={1080}
          height={1350}
          defaultProps={{ giornata, indice: i, mostraRisultato: true }}
        />
        <Still<any, LocandinaProps>
          id={`Presentazione-${i + 1}`}
          component={Locandina}
          width={1080}
          height={1350}
          defaultProps={{ giornata, indice: i, mostraRisultato: false }}
        />
      </React.Fragment>
    ))}
    {/* Copertina della giornata: i 4 scontri in un'unica immagine verticale */}
    <Still<any, CopertinaProps>
      id="Copertina"
      component={CopertinaGiornata}
      width={1080}
      height={1920}
      defaultProps={{ lega: (preGiornata as any).lega, giornata: (preGiornata as any).giornata, sfide: (preGiornata as any).sfide }}
    />
    {/* Locandine pre-giornata: i 4 big per squadra (dati/pregiornata-N.json, sostituibili con --props) */}
    {(preGiornata as any).sfide.map((sf: any, i: number) => (
      <Still<any, SfidaProps>
        key={`sfida-${i}`}
        id={`Sfida-${i + 1}`}
        component={Sfida}
        width={1080}
        height={1350}
        defaultProps={{ lega: (preGiornata as any).lega, giornata: (preGiornata as any).giornata, indice: i, totale: (preGiornata as any).sfide.length, casa: sf.casa, trasferta: sf.trasferta }}
      />
    ))}
  </>
);
