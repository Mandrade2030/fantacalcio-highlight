import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { AvatarAllenatore } from "../components/Allenatore";
import lega from "../data/lega.json";
import type { Allenatore } from "../data/types";
import { C, FONT, accendi, conAlpha, testoSu } from "../theme";
import type { LatoSfida } from "./Sfida";

// Copertina della giornata (1080x1920): i 4 scontri nella stessa immagine, stile "Sfida":
// per ogni squadra il capitano grande + gli altri 3 big, presidente piccolo, posizione e punti.

export interface CopertinaProps {
  lega?: string;
  giornata: number;
  sfide: { casa: LatoSfida; trasferta: LatoSfida }[];
  [key: string]: unknown;
}

const squadra = (id: string): Allenatore => {
  const s = (lega as any).squadre.find((x: any) => x.id === id);
  if (!s) throw new Error(`Squadra sconosciuta: ${id}`);
  return { ...s, nome: s.presidente, squadra: s.nome } as Allenatore;
};
const src = (s: string) => (s.startsWith("http") || s.startsWith("file:") ? s : staticFile(s));

const TOP = 230;
const BH = 418;

const Lato: React.FC<{ lato: LatoSfida; destra: boolean; col: string; y: number }> = ({ lato, destra, col, y }) => {
  const a = squadra(lato.id);
  const cap = lato.stelle.find((s) => s.capitano) ?? lato.stelle[0];
  const altri = lato.stelle.filter((s) => s !== cap).slice(0, 3);
  const X = (x: number, w: number) => (destra ? 1080 - x - w : x); // specchia le posizioni a destra
  const primo = lato.posizione === 1;
  const ultimo = lato.posizione === 8;
  const ombra = `drop-shadow(0 0 12px ${conAlpha(col, 0.6)}) drop-shadow(0 8px 10px rgba(0,0,0,0.6))`;
  return (
    <>
      {/* gli altri tre big, in alto verso l'esterno */}
      {altri.map((p, i) => (
        <Img key={p.nome} src={src(p.immagine)} style={{ position: "absolute", left: X(4 + i * 78, 150), top: y + 22 + (i === 1 ? -10 : 6), width: 150, height: 150, objectFit: "contain", filter: ombra }} />
      ))}
      <div
        style={{
          position: "absolute",
          left: X(6, 250),
          width: 250,
          top: y + 172,
          textAlign: destra ? "right" : "left",
          fontFamily: FONT,
          fontWeight: 800,
          fontStyle: "italic",
          fontSize: 17,
          color: "rgba(255,255,255,0.85)",
          textTransform: "uppercase",
          lineHeight: 1.25,
          textShadow: "0 2px 6px rgba(0,0,0,0.8)",
        }}
      >
        {altri.map((p) => p.nome).join(" · ")}
      </div>

      {/* capitano */}
      <Img src={src(cap.immagine)} style={{ position: "absolute", left: X(228, 300), top: y + 14, width: 300, height: 300, objectFit: "contain", filter: `drop-shadow(0 0 22px ${conAlpha(col, 0.75)}) drop-shadow(0 14px 16px rgba(0,0,0,0.7))` }} />
      <div style={{ position: "absolute", left: X(228, 300), width: 300, top: y + 300, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontFamily: FONT,
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: 24,
            lineHeight: 1,
            padding: "7px 12px",
            background: "rgba(8,10,20,0.9)",
            color: C.ink,
            border: `2px solid ${col}`,
            borderRadius: 7,
            transform: "skewX(-8deg)",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {cap.capitano && <span style={{ background: C.gold, color: "#1a1000", borderRadius: 5, padding: "2px 6px", fontSize: 18 }}>C</span>}
          {cap.nome}
        </div>
      </div>

      {/* squadra, presidente, classifica */}
      <div style={{ position: "absolute", left: X(0, 236), top: y + 210, width: 236, height: 200, display: "flex", flexDirection: destra ? "row-reverse" : "row", alignItems: "flex-end" }}>
        <div style={{ width: 92, height: 115, flexShrink: 0, position: "relative" }}>
          <AvatarAllenatore allenatore={a} emozione="grinta" size={92} effetti={false} />
        </div>
        <div style={{ flex: 1, padding: destra ? "0 8px 8px 0" : "0 0 8px 8px", textAlign: destra ? "right" : "left" }}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontStyle: "italic",
              textTransform: "uppercase",
              fontSize: a.squadra.length > 12 ? 23 : 28,
              lineHeight: 0.98,
              color: C.ink,
              textShadow: `0 3px 0 ${conAlpha(col, 0.95)}, 0 6px 16px rgba(0,0,0,0.7)`,
            }}
          >
            {a.squadra}
          </div>
          {lato.posizione != null && (
            <div
              style={{
                display: "inline-block",
                marginTop: 7,
                fontFamily: FONT,
                fontWeight: 900,
                fontStyle: "italic",
                fontSize: 16,
                padding: "5px 8px",
                borderRadius: 6,
                transform: "skewX(-8deg)",
                background: primo ? C.gold : ultimo ? C.red : col,
                color: primo ? "#1a1000" : ultimo ? "#fff" : testoSu(col),
                border: "2px solid rgba(255,255,255,0.85)",
                whiteSpace: "nowrap",
              }}
            >
              {lato.posizione}° · {lato.punti ?? 0} PT
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const CopertinaGiornata: React.FC<CopertinaProps> = ({ lega: nomeLega = "Ciempions Fig", giornata, sfide }) => (
  <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 30% at 50% 0%, rgba(198,255,46,0.18), transparent 70%)" }} />

    {/* intestazione */}
    <div style={{ position: "absolute", top: 50, width: "100%", textAlign: "center", fontFamily: FONT }}>
      <div style={{ fontWeight: 800, fontSize: 28, letterSpacing: 10, color: C.ink, opacity: 0.85, textTransform: "uppercase" }}>{nomeLega}</div>
      <div
        style={{
          marginTop: 6,
          fontWeight: 900,
          fontStyle: "italic",
          fontSize: 112,
          lineHeight: 1,
          color: C.ink,
          textTransform: "uppercase",
          textShadow: `0 6px 0 ${C.lime}, 0 14px 40px rgba(0,0,0,0.7)`,
        }}
      >
        Giornata {giornata}
      </div>
    </div>

    {sfide.slice(0, 4).map((sf, i) => {
      const A = squadra(sf.casa.id);
      const B = squadra(sf.trasferta.id);
      const colA = accendi(A.colori.primario, 0.3);
      let colB = accendi(B.colori.primario, 0.3);
      if (colA.toLowerCase() === colB.toLowerCase()) colB = accendi(B.colori.secondario, 0.3);
      const y = TOP + i * BH;
      return (
        <React.Fragment key={i}>
          {/* fascia con le due metà colorate */}
          <div style={{ position: "absolute", left: 0, right: 0, top: y, height: BH - 8, background: `linear-gradient(100deg, ${colA} 0%, ${conAlpha(colA, 0.25)} 42%, transparent 50%)`, clipPath: "polygon(0 0, 54% 0, 46% 100%, 0 100%)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: y, height: BH - 8, background: `linear-gradient(260deg, ${colB} 0%, ${conAlpha(colB, 0.25)} 42%, transparent 50%)`, clipPath: "polygon(54% 0, 100% 0, 100% 100%, 46% 100%)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: y, height: BH - 8, background: "linear-gradient(180deg, rgba(6,7,13,0.15) 0%, rgba(6,7,13,0.15) 55%, rgba(6,7,13,0.85) 100%)" }} />
          <div style={{ position: "absolute", left: "50%", top: y + 10, height: BH - 28, width: 5, background: "#fff", transform: "translateX(-50%) skewX(-7deg)", boxShadow: "0 0 24px #fff" }} />

          <Lato lato={sf.casa} destra={false} col={colA} y={y} />
          <Lato lato={sf.trasferta} destra col={colB} y={y} />

          <div
            style={{
              position: "absolute",
              left: "50%",
              top: y + 150,
              transform: "translate(-50%, -50%) rotate(-8deg)",
              fontFamily: FONT,
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: 88,
              color: "#fff",
              WebkitTextStroke: "4px #0A0C16",
              textShadow: `0 0 26px ${C.lime}, 0 7px 0 #0A0C16`,
              lineHeight: 1,
            }}
          >
            VS
          </div>
        </React.Fragment>
      );
    })}
  </AbsoluteFill>
);
