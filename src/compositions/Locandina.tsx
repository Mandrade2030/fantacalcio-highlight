import React from "react";
import { AbsoluteFill } from "remotion";
import { AvatarAllenatore } from "../components/Allenatore";
import { Stemma, Titolone } from "../components/Grafica";
import type { Giornata, GiornataInput } from "../data/types";
import { analizzaScontro, formatVoto } from "../lib/fanta";
import { preparaGiornata } from "../lib/lega";
import { ETICHETTA_TAG } from "../lib/telecronaca";
import { C, FONT, accendi, conAlpha } from "../theme";

// Locandina 1080x1350 (4:5, perfetta come anteprima su WhatsApp/Instagram).
// mostraRisultato=false -> poster pre-partita con gli allenatori "carichi".

export interface LocandinaProps {
  giornata: Giornata | GiornataInput;
  indice: number;
  mostraRisultato: boolean;
  [key: string]: unknown;
}

export const Locandina: React.FC<LocandinaProps> = ({ giornata: input, indice, mostraRisultato }) => {
  const g = preparaGiornata(input);
  const a = analizzaScontro(g, indice);
  const colA = accendi(a.casa.allenatore.colori.primario);
  const colB = accendi(a.trasferta.allenatore.colori.primario);
  const tags = a.tag.map((t) => ETICHETTA_TAG[t]).filter((t) => t && t !== a.titoloSfida.toUpperCase());

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      {/* due metà diagonali */}
      <div style={{ position: "absolute", inset: 0, background: colA, clipPath: "polygon(0 0, 62% 0, 38% 100%, 0 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: colB, clipPath: "polygon(62% 0, 100% 0, 100% 100%, 38% 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,7,13,0.92) 0%, rgba(6,7,13,0.35) 38%, rgba(6,7,13,0.2) 60%, rgba(6,7,13,0.95) 100%)" }} />
      <AbsoluteFill
        style={{
          backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 60px)",
        }}
      />
      {/* lampo centrale */}
      <div style={{ position: "absolute", left: "50%", top: 330, bottom: 0, width: 10, background: "#fff", transform: "translateX(-50%) skewX(-10deg)", boxShadow: "0 0 50px #fff" }} />

      {/* intestazione */}
      <div style={{ position: "absolute", top: 54, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 28, letterSpacing: 8, color: C.ink, opacity: 0.8, textTransform: "uppercase" }}>
          {g.lega} · Giornata {g.giornata}
        </div>
        <Titolone size={92} style={{ marginTop: 16, padding: "0 40px", textShadow: "0 8px 30px rgba(0,0,0,0.6)" }}>
          {a.titoloSfida}
        </Titolone>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 20 }}>
          {tags.map((t) => (
            <span key={t} style={{ fontFamily: FONT, fontWeight: 900, fontStyle: "italic", fontSize: 28, padding: "8px 18px", background: C.lime, color: "#0A0C16", transform: "skewX(-10deg)" }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* allenatori faccia a faccia */}
      <div style={{ position: "absolute", left: -30, top: 420 }}>
        <AvatarAllenatore allenatore={a.casa.allenatore} emozione={mostraRisultato ? a.casa.emozione : "grinta"} size={580} effetti={mostraRisultato} />
      </div>
      <div style={{ position: "absolute", right: -30, top: 420 }}>
        <AvatarAllenatore allenatore={a.trasferta.allenatore} emozione={mostraRisultato ? a.trasferta.emozione : "grinta"} size={580} flip effetti={mostraRisultato} />
      </div>

      {/* VS o risultato */}
      <div style={{ position: "absolute", top: 560, width: "100%", display: "flex", justifyContent: "center" }}>
        {mostraRisultato ? (
          <div style={{ background: "#fff", padding: "6px 36px 14px", transform: "rotate(-6deg)", boxShadow: `14px 14px 0 ${C.lime}` }}>
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 26, letterSpacing: 6, color: "#0A0C16", textAlign: "center" }}>FINALE</div>
            <Titolone size={170} color="#0A0C16" style={{ letterSpacing: 0 }}>
              {a.casa.gol}-{a.trasferta.gol}
            </Titolone>
          </div>
        ) : (
          <Titolone size={220} color={C.lime} style={{ transform: "rotate(-8deg)", textShadow: `0 0 60px ${conAlpha(C.lime, 0.6)}, 0 16px 0 #000` }}>
            VS
          </Titolone>
        )}
      </div>

      {/* nomi squadra */}
      <div style={{ position: "absolute", bottom: 60, left: 60, right: 60, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        {[a.casa, a.trasferta].map((c, i) => (
          <div key={c.lato} style={{ textAlign: i === 0 ? "left" : "right", maxWidth: 440, display: "flex", flexDirection: "column", alignItems: i === 0 ? "flex-start" : "flex-end" }}>
            <Stemma src={c.allenatore.logo} size={110} style={{ marginBottom: 10 }} />
            <Titolone size={110} color={i === 0 ? colA : colB} style={{ textShadow: "0 6px 24px rgba(0,0,0,0.7)" }}>
              {c.allenatore.sigla}
            </Titolone>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 32, color: C.ink, marginTop: 6 }}>{c.allenatore.squadra}</div>
            <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: C.mute, marginTop: 4 }}>
              Mister {c.allenatore.nome}
              {mostraRisultato ? ` · ${formatVoto(c.punteggio)} pt` : a.classificaVuota ? "" : ` · ${c.posizione}° in classifica`}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
