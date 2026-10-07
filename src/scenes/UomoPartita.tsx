import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BadgeGiocatore, BarraTelecronaca, Titolone } from "../components/Grafica";
import type { AnalisiScontro } from "../lib/fanta";
import { formatVoto } from "../lib/fanta";
import { C, FONT, accendi } from "../theme";

export const UomoPartita: React.FC<{ a: AnalisiScontro; frase: string }> = ({ a, frase }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { giocatore, lato } = a.mvp;
  const team = lato === "casa" ? a.casa : a.trasferta;
  const col = accendi(team.allenatore.colori.primario);

  const ing = spring({ frame: f - 4, fps, config: { damping: 11, stiffness: 120 } });
  const tit = spring({ frame: f, fps, config: { damping: 15 } });
  const fv = giocatore.fantavoto ?? 0;
  const conta = interpolate(f, [14, 44], [0, fv], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* raggi dorati */}
      <AbsoluteFill
        style={{
          background: `repeating-conic-gradient(from ${f * 0.8}deg at 50% 36%, rgba(255,200,61,0.22) 0deg 8deg, transparent 8deg 20deg)`,
          opacity: ing,
          maskImage: "radial-gradient(circle at 50% 36%, black 10%, transparent 60%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 36%, black 10%, transparent 60%)",
        }}
      />
      <div style={{ position: "absolute", top: 180, width: "100%", textAlign: "center", opacity: tit }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 34, letterSpacing: 10, color: C.gold }}>★ ★ ★</div>
        <Titolone size={110} color={C.gold} style={{ marginTop: 10 }}>
          Uomo partita
        </Titolone>
      </div>

      <div style={{ position: "absolute", left: 540 - 260, top: 440, transform: `scale(${ing}) rotate(${(1 - ing) * -30}deg)` }}>
        <BadgeGiocatore giocatore={giocatore} colore={team.allenatore.colori.primario} size={520} />
      </div>

      <div style={{ position: "absolute", top: 1010, width: "100%", textAlign: "center", opacity: ing }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 64, color: C.ink }}>{giocatore.nome}</div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 36, color: col, marginTop: 6 }}>{team.allenatore.squadra}</div>
      </div>

      <div style={{ position: "absolute", top: 1170, width: "100%", display: "flex", justifyContent: "center", alignItems: "baseline", gap: 18 }}>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 40, color: C.mute }}>FANTAVOTO</span>
        <Titolone size={190} color={C.gold} style={{ textShadow: "0 0 60px rgba(255,200,61,0.5)" }}>
          {f >= 44 ? formatVoto(fv) : conta.toFixed(1).replace(".", ",")}
        </Titolone>
      </div>

      <BarraTelecronaca testo={frase} colore={C.gold} da={30} y={1500} />
    </AbsoluteFill>
  );
};
