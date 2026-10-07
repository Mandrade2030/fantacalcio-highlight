import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AvatarAllenatore } from "../components/Allenatore";
import { BarraTelecronaca, Coriandoli, Stemma, Titolone } from "../components/Grafica";
import type { AnalisiScontro, Contendente } from "../lib/fanta";
import { formatVoto } from "../lib/fanta";
import { C, FONT, accendi, testoSu } from "../theme";

const ETICHETTA_EMO: Record<string, string> = {
  esultanza: "GODE",
  neutro: "IMPASSIBILE",
  rabbia: "FURIOSO",
  tristezza: "AFFRANTO",
  pianto: "IN LACRIME",
  grinta: "CARICO",
};

export const Verdetto: React.FC<{ a: AnalisiScontro; frase: string; lega: string; giornata: number }> = ({ a, frase, lega, giornata }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const tab = spring({ frame: f, fps, config: { damping: 13, stiffness: 140 } });
  const golPop = spring({ frame: f - 10, fps, config: { damping: 8, stiffness: 200 } });
  const allA = spring({ frame: f - 16, fps, config: { damping: 14 } });
  const allB = spring({ frame: f - 22, fps, config: { damping: 14 } });
  const outro = interpolate(f, [durationInFrames - 34, durationInFrames - 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const colA = accendi(a.casa.allenatore.colori.primario);
  const colB = accendi(a.trasferta.allenatore.colori.primario);
  const vincitore = a.vincitore === "casa" ? a.casa : a.vincitore === "trasferta" ? a.trasferta : null;

  const blocco = (c: Contendente, x: number, p: number, fase: number, flip: boolean) => {
    const vince = a.vincitore === c.lato;
    const scala = a.vincitore === null ? 1 : vince ? 1.06 : 0.92;
    return (
      <div
        style={{
          position: "absolute",
          left: x,
          top: 640,
          width: 500,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${(1 - p) * 600}px) scale(${scala})`,
          transformOrigin: "50% 100%",
        }}
      >
        {vince && (
          <div style={{ fontFamily: FONT, fontSize: 90, lineHeight: 1, marginBottom: -20, transform: `rotate(${Math.sin(f / 8) * 8}deg)`, color: C.gold, fontWeight: 900 }}>
            ♛
          </div>
        )}
        <AvatarAllenatore allenatore={c.allenatore} emozione={c.emozione} size={440} flip={flip} fase={fase} />
        <div
          style={{
            marginTop: -10,
            fontFamily: FONT,
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: 34,
            letterSpacing: 2,
            padding: "8px 18px",
            background: vince ? C.lime : "rgba(255,255,255,0.12)",
            color: vince ? "#0A0C16" : C.ink,
            transform: "skewX(-10deg)",
          }}
        >
          {c.allenatore.nome.toUpperCase()} {ETICHETTA_EMO[c.emozione]}
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill>
      {vincitore && (
        <Coriandoli colori={[accendi(vincitore.allenatore.colori.primario), vincitore.allenatore.colori.secondario, C.gold, "#fff"]} da={14} />
      )}

      <div style={{ position: "absolute", top: 160, width: "100%", textAlign: "center", opacity: tab }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 34, letterSpacing: 12, color: C.mute }}>RISULTATO FINALE</div>
      </div>

      {/* tabellone */}
      <div
        style={{
          position: "absolute",
          top: 240,
          left: 60,
          right: 60,
          height: 300,
          display: "flex",
          alignItems: "stretch",
          transform: `scaleX(${tab})`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ flex: 1, background: colA, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Stemma src={a.casa.allenatore.logo} size={84} style={{ marginBottom: 8 }} />
          <Titolone size={80} color={testoSu(colA)}>{a.casa.allenatore.sigla}</Titolone>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: testoSu(colA), opacity: 0.85 }}>{formatVoto(a.casa.punteggio)}</div>
        </div>
        <div style={{ width: 380, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Titolone size={190} color="#0A0C16" style={{ transform: `scale(${interpolate(golPop, [0, 1], [0.2, 1])})`, letterSpacing: 0 }}>
            {a.casa.gol}-{a.trasferta.gol}
          </Titolone>
        </div>
        <div style={{ flex: 1, background: colB, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Stemma src={a.trasferta.allenatore.logo} size={84} style={{ marginBottom: 8 }} />
          <Titolone size={80} color={testoSu(colB)}>{a.trasferta.allenatore.sigla}</Titolone>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: testoSu(colB), opacity: 0.85 }}>{formatVoto(a.trasferta.punteggio)}</div>
        </div>
      </div>

      {blocco(a.casa, 20, allA, 0, false)}
      {blocco(a.trasferta, 560, allB, 41, true)}

      <BarraTelecronaca testo={frase} colore={vincitore ? accendi(vincitore.allenatore.colori.primario) : C.red} da={40} y={1430} />

      <div
        style={{
          position: "absolute",
          bottom: 70,
          width: "100%",
          textAlign: "center",
          opacity: outro,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 30,
          letterSpacing: 6,
          color: C.mute,
          textTransform: "uppercase",
        }}
      >
        {lega} · giornata {giornata}
      </div>
    </AbsoluteFill>
  );
};
