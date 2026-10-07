import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AvatarAllenatore } from "../components/Allenatore";
import { BarraTelecronaca, Stemma, Titolone } from "../components/Grafica";
import type { AnalisiScontro, Contendente } from "../lib/fanta";
import { C, FONT, accendi } from "../theme";

const Scheda: React.FC<{ c: Contendente; align: "left" | "right"; p: number; esordio: boolean }> = ({ c, align, p, esordio }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: align === "left" ? "flex-start" : "flex-end",
      textAlign: align,
      gap: 10,
      opacity: p,
      transform: `translateX(${(1 - p) * (align === "left" ? 120 : -120)}px)`,
    }}
  >
    <Stemma src={c.allenatore.logo} size={120} style={{ marginBottom: 6 }} />
    <Titolone size={170} color={accendi(c.allenatore.colori.primario)} style={{ textShadow: "0 10px 40px rgba(0,0,0,.5)" }}>
      {c.allenatore.sigla}
    </Titolone>
    <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 42, color: C.ink, lineHeight: 1.05, maxWidth: 470 }}>
      {c.allenatore.squadra}
    </div>
    {!esordio && (
      <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 32, color: C.mute }}>
        Mister {c.allenatore.nome}
      </div>
    )}
    <div
      style={{
        marginTop: 8,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 30,
        padding: "8px 16px",
        background: "rgba(255,255,255,0.1)",
        border: "2px solid rgba(255,255,255,0.25)",
        color: C.ink,
        letterSpacing: 1,
      }}
    >
      {esordio ? `PRESIDENTE ${c.allenatore.nome.toUpperCase()}` : `${c.posizione}° POSTO · ${c.puntiClassifica} PT`}
    </div>
  </div>
);

export const FaceOff: React.FC<{ a: AnalisiScontro; frase: string }> = ({ a, frase }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inA = spring({ frame: f - 2, fps, config: { damping: 15, stiffness: 120 } });
  const inB = spring({ frame: f - 10, fps, config: { damping: 15, stiffness: 120 } });
  const vs = spring({ frame: f - 24, fps, config: { damping: 9, stiffness: 180 } });
  const shake = f >= 26 && f < 36 ? Math.sin(f * 7) * (36 - f) * 2 : 0;
  const lampo = interpolate(f, [24, 27, 34], [0, 0.55, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = interpolate(f, [0, 135], [0, -30]);

  return (
    <AbsoluteFill style={{ transform: `translate(${shake}px, ${-shake * 0.4}px)` }}>
      {/* metà superiore: casa */}
      <div style={{ position: "absolute", top: 170, left: 20, transform: `translateX(${(1 - inA) * -700 + drift * -0.3}px)` }}>
        <AvatarAllenatore allenatore={a.casa.allenatore} emozione="grinta" size={480} />
      </div>
      <div style={{ position: "absolute", top: 300, right: 60 }}>
        <Scheda c={a.casa} align="right" p={inA} esordio={a.classificaVuota} />
      </div>

      {/* divisore diagonale + VS */}
      <div
        style={{
          position: "absolute",
          top: 860,
          left: -100,
          width: 1300,
          height: 8,
          background: `linear-gradient(90deg, ${accendi(a.casa.allenatore.colori.primario)}, #fff, ${accendi(a.trasferta.allenatore.colori.primario)})`,
          transform: `rotate(-8deg) scaleX(${inB})`,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", top: 690, height: 360, justifyContent: "center" }}>
        <Titolone
          size={300}
          color={C.lime}
          style={{
            transform: `scale(${interpolate(vs, [0, 1], [4, 1])}) rotate(-8deg)`,
            opacity: Math.min(1, vs * 1.5),
            textShadow: `0 0 60px rgba(198,255,46,0.55), 0 20px 0 #000`,
          }}
        >
          VS
        </Titolone>
      </AbsoluteFill>

      {/* metà inferiore: trasferta */}
      <div style={{ position: "absolute", top: 1000, right: 20, transform: `translateX(${(1 - inB) * 700 + drift * 0.3}px)` }}>
        <AvatarAllenatore allenatore={a.trasferta.allenatore} emozione="grinta" size={480} flip fase={37} />
      </div>
      <div style={{ position: "absolute", top: 1120, left: 60 }}>
        <Scheda c={a.trasferta} align="left" p={inB} esordio={a.classificaVuota} />
      </div>

      <AbsoluteFill style={{ background: "#fff", opacity: lampo }} />
      <BarraTelecronaca testo={frase} colore={C.red} da={44} y={1640} />
    </AbsoluteFill>
  );
};
