import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Titolone } from "../components/Grafica";
import type { AnalisiScontro, Contendente } from "../lib/fanta";
import { formatVoto, golDaPunteggio } from "../lib/fanta";
import { C, FONT, accendi, conAlpha } from "../theme";

// I fantapunti salgono come due termometri: ogni soglia superata = un gol.

export const CORSA = { BASE: 40, START: 20, END: 115 };
const { BASE, START, END } = CORSA;
const TOP_Y = 470;
const BOTTOM_Y = 1580;

/** frame (relativi alla scena) in cui la colonna supera ciascuna soglia: servono anche per i "ding" audio */
export const frameSoglie = (punteggio: number, soglie: { base: number; passo: number }) => {
  const out: number[] = [];
  let prossima = soglie.base;
  for (let k = START; k <= END && prossima <= punteggio; k++) {
    const p = interpolate(k, [START, END], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    if (BASE + (punteggio - BASE) * p >= prossima) {
      out.push(k);
      prossima += soglie.passo;
      k--; // la stessa frame può superare più soglie
    }
  }
  return out;
};

export const CorsaAlGol: React.FC<{ a: AnalisiScontro; soglie: { base: number; passo: number } }> = ({ a, soglie }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const maxP = Math.max(soglie.base + soglie.passo * 3, a.casa.punteggio + 4, a.trasferta.punteggio + 4);
  const yDi = (p: number) => BOTTOM_Y - ((p - BASE) / (maxP - BASE)) * (BOTTOM_Y - TOP_Y);

  const prog = interpolate(f, [START, END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const valore = (c: Contendente) => BASE + (c.punteggio - BASE) * prog;

  const soglieVis: number[] = [];
  for (let s = soglie.base; s <= maxP; s += soglie.passo) soglieVis.push(s);

  const titolo = spring({ frame: f, fps, config: { damping: 16 } });
  const finale = spring({ frame: f - END - 6, fps, config: { damping: 10, stiffness: 160 } });

  const colonna = (c: Contendente, cx: number) => {
    const col = accendi(c.allenatore.colori.primario);
    const v = valore(c);
    const gol = f >= END ? c.gol : golDaPunteggio(v, soglie);
    // frame in cui ha superato l'ultima soglia -> pop
    const ultimaSoglia = gol > 0 ? soglie.base + (gol - 1) * soglie.passo : null;
    let fCross = -100;
    if (ultimaSoglia !== null && f < END) {
      for (let k = START; k <= f; k++) {
        const pk = interpolate(k, [START, END], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
        if (BASE + (c.punteggio - BASE) * pk >= ultimaSoglia) {
          fCross = k;
          break;
        }
      }
    }
    const pop = f - fCross < 12 && fCross > 0 ? 1 + 0.35 * Math.sin(((f - fCross) / 12) * Math.PI) : 1;
    const y = yDi(v);
    const vinta = a.vincitore === c.lato;

    return (
      <>
        {/* colonna */}
        <div
          style={{
            position: "absolute",
            left: cx - 120,
            width: 240,
            top: y,
            height: BOTTOM_Y - y,
            background: `linear-gradient(180deg, ${col}, ${conAlpha(col, 0.35)})`,
            boxShadow: `0 0 60px ${conAlpha(col, 0.55)}`,
            borderTop: "6px solid #fff",
          }}
        />
        {/* punteggio e gol sopra la colonna */}
        <div
          style={{
            position: "absolute",
            left: cx - 200,
            width: 400,
            top: y - 230,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 120,
              color: C.ink,
              transform: `scale(${pop * (f >= END ? interpolate(finale, [0, 1], [1, vinta ? 1.15 : 0.95]) : 1)})`,
              lineHeight: 1,
              textShadow: "0 10px 30px rgba(0,0,0,0.6)",
            }}
          >
            {gol}
            <span style={{ fontSize: 44, marginLeft: 8 }}>GOL</span>
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 54, color: col, marginTop: 6 }}>
            {f >= END ? formatVoto(c.punteggio) : v.toFixed(1).replace(".", ",")}
          </div>
        </div>
        {/* sigla sotto */}
        <div style={{ position: "absolute", left: cx - 200, width: 400, top: BOTTOM_Y + 24, textAlign: "center" }}>
          <Titolone size={80} color={col}>
            {c.allenatore.sigla}
          </Titolone>
        </div>
      </>
    );
  };

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 170, width: "100%", textAlign: "center", opacity: titolo, transform: `translateY(${(1 - titolo) * -40}px)` }}>
        <Titolone size={96}>La corsa al gol</Titolone>
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 32, color: C.mute, marginTop: 14 }}>
          {soglie.base} punti = 1 gol, poi +1 ogni {soglie.passo}
        </div>
      </div>

      {/* linee soglia */}
      {soglieVis.map((s, i) => {
        const y = yDi(s);
        const comparsa = interpolate(f, [4 + i * 3, 14 + i * 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const superataDa = [a.casa, a.trasferta].some((c) => valore(c) >= s);
        return (
          <div key={s} style={{ position: "absolute", top: y, left: 70, right: 70, opacity: comparsa }}>
            <div style={{ height: 3, background: superataDa ? C.lime : "rgba(255,255,255,0.25)", boxShadow: superataDa ? `0 0 18px ${C.lime}` : undefined }} />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: -22,
                transform: "translateX(-50%)",
                background: superataDa ? C.lime : "#1A1E30",
                color: superataDa ? "#0A0C16" : C.mute,
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 26,
                padding: "6px 14px",
                whiteSpace: "nowrap",
              }}
            >
              {s} · {i + 1}
            </div>
          </div>
        );
      })}

      {colonna(a.casa, 300)}
      {colonna(a.trasferta, 780)}
    </AbsoluteFill>
  );
};
