import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Titolone } from "../components/Grafica";
import type { AnalisiScontro } from "../lib/fanta";
import { ETICHETTA_TAG } from "../lib/telecronaca";
import { C, FONT, accendi } from "../theme";

export const Intro: React.FC<{ a: AnalisiScontro; giornata: number; lega: string }> = ({ a, giornata, lega }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colA = accendi(a.casa.allenatore.colori.primario);
  const colB = accendi(a.trasferta.allenatore.colori.primario);

  const bandA = spring({ frame: f, fps, config: { damping: 18, stiffness: 160 } });
  const bandB = spring({ frame: f - 4, fps, config: { damping: 18, stiffness: 160 } });
  const num = spring({ frame: f - 6, fps, config: { damping: 11, stiffness: 120, mass: 0.9 } });
  const tit = spring({ frame: f - 22, fps, config: { damping: 16 } });
  const tagS = spring({ frame: f - 32, fps, config: { damping: 14 } });
  const shake = f >= 10 && f < 18 ? Math.sin(f * 9) * (18 - f) * 1.6 : 0;
  const zoomOut = interpolate(f, [60, 75], [1, 1.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const tags = a.tag.map((t) => ETICHETTA_TAG[t]).filter((t) => t && t !== a.titoloSfida.toUpperCase());

  return (
    <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.5}px) scale(${zoomOut})` }}>
      {/* bande colore */}
      <div
        style={{
          position: "absolute",
          top: 560,
          left: -200,
          width: 1500,
          height: 300,
          background: colA,
          transform: `translateX(${(1 - bandA) * -1600}px) skewY(-8deg)`,
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 900,
          left: -200,
          width: 1500,
          height: 300,
          background: colB,
          transform: `translateX(${(1 - bandB) * 1600}px) skewY(-8deg)`,
          opacity: 0.9,
        }}
      />

      <div style={{ position: "absolute", top: 260, width: "100%", textAlign: "center", opacity: interpolate(f, [0, 10], [0, 1]) }}>
        <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 800, letterSpacing: 10, color: C.mute, textTransform: "uppercase" }}>
          {lega}
        </div>
      </div>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <Titolone size={130} stroke style={{ marginBottom: -30, opacity: bandA }}>
          Giornata
        </Titolone>
        <Titolone
          size={560}
          style={{
            transform: `scale(${interpolate(num, [0, 1], [3, 1])}) rotate(-4deg)`,
            opacity: Math.min(1, num * 2),
            textShadow: "0 30px 80px rgba(0,0,0,0.6)",
          }}
        >
          {giornata}
        </Titolone>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          top: 1360,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 30,
        }}
      >
        <div style={{ clipPath: `inset(0 ${(1 - tit) * 100}% 0 0)`, padding: "0 40px" }}>
          <Titolone size={92} style={{ textAlign: "center" }}>
            {a.titoloSfida}
          </Titolone>
        </div>
        <div style={{ display: "flex", gap: 18, transform: `scale(${tagS})` }}>
          {tags.map((t) => (
            <div
              key={t}
              style={{
                fontFamily: FONT,
                fontWeight: 900,
                fontStyle: "italic",
                fontSize: 34,
                letterSpacing: 2,
                padding: "10px 22px",
                background: C.lime,
                color: "#0A0C16",
                transform: "skewX(-10deg)",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
