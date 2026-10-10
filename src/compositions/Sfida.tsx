import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { AvatarAllenatore } from "../components/Allenatore";
import lega from "../data/lega.json";
import type { Allenatore } from "../data/types";
import { C, FONT, accendi, conAlpha, testoSu } from "../theme";

// Locandina PRE-GIORNATA di una sfida (1080x1350): i 4 big di ogni squadra (capitano in primo piano)
// schierati contro i 4 avversari, con il presidente piccolo a bordo campo.
// Le figure dei calciatori sono i "campioncini" di fantacalcio.it (URL o file in public/).

export interface Stella {
  nome: string;
  ruolo?: string;
  immagine: string;
  capitano?: boolean;
}
export interface LatoSfida {
  id: string;
  posizione?: number;
  punti?: number;
  stelle: Stella[];
}
export interface SfidaProps {
  lega?: string;
  giornata: number;
  indice: number;
  totale?: number;
  casa: LatoSfida;
  trasferta: LatoSfida;
  [key: string]: unknown;
}

const squadra = (id: string): Allenatore => {
  const s = (lega as any).squadre.find((x: any) => x.id === id);
  if (!s) throw new Error(`Squadra sconosciuta: ${id}`);
  return { ...s, nome: s.presidente, squadra: s.nome } as Allenatore;
};
const src = (s: string) => (s.startsWith("http") || s.startsWith("file:") ? s : staticFile(s));

const Tag: React.FC<{ testo: string; col: string; grande?: boolean; capitano?: boolean }> = ({ testo, col, grande, capitano }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontFamily: FONT,
      fontWeight: 900,
      fontStyle: "italic",
      textTransform: "uppercase",
      fontSize: grande ? 34 : 22,
      lineHeight: 1,
      padding: grande ? "10px 18px" : "6px 12px",
      background: "rgba(8,10,20,0.88)",
      color: C.ink,
      border: `${grande ? 3 : 2}px solid ${col}`,
      borderRadius: 8,
      transform: "skewX(-8deg)",
      boxShadow: "0 6px 18px rgba(0,0,0,0.55)",
      whiteSpace: "nowrap",
    }}
  >
    {capitano && (
      <span style={{ background: C.gold, color: "#1a1000", borderRadius: 6, padding: "2px 8px", fontSize: grande ? 26 : 18 }}>C</span>
    )}
    {testo}
  </div>
);

const Gruppo: React.FC<{ lato: LatoSfida; destra: boolean; col: string }> = ({ lato, destra, col }) => {
  const cap = lato.stelle.find((s) => s.capitano) ?? lato.stelle[0];
  const altri = lato.stelle.filter((s) => s !== cap).slice(0, 3);
  const base = destra ? 540 : 0;
  // tre big dietro (in alto), il capitano davanti e più grande
  const posti = [
    { x: 8, y: 150, s: 240 },
    { x: 150, y: 118, s: 240 },
    { x: 292, y: 150, s: 240 },
  ];
  return (
    <>
      {altri.map((p, i) => {
        const q = posti[destra ? 2 - i : i];
        return (
          <div key={p.nome} style={{ position: "absolute", left: base + q.x, top: q.y, width: q.s, height: q.s + 40 }}>
            <Img
              src={src(p.immagine)}
              style={{ width: q.s, height: q.s, objectFit: "contain", filter: `drop-shadow(0 0 14px ${conAlpha(col, 0.55)}) drop-shadow(0 10px 14px rgba(0,0,0,0.6))` }}
            />
            <div style={{ position: "absolute", left: 0, right: 0, top: q.s - 26, display: "flex", justifyContent: "center" }}>
              <Tag testo={p.nome} col={col} />
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: base + 25, top: 395, width: 490, height: 520 }}>
        <div
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            bottom: 30,
            height: 70,
            borderRadius: "50%",
            background: `radial-gradient(ellipse at center, ${conAlpha(col, 0.55)} 0%, transparent 70%)`,
          }}
        />
        <Img
          src={src(cap.immagine)}
          style={{ width: 490, height: 490, objectFit: "contain", filter: `drop-shadow(0 0 26px ${conAlpha(col, 0.7)}) drop-shadow(0 16px 20px rgba(0,0,0,0.7))` }}
        />
        <div style={{ position: "absolute", left: 0, right: 0, top: 462, display: "flex", justifyContent: "center" }}>
          <Tag testo={cap.nome} col={col} grande capitano={!!cap.capitano} />
        </div>
      </div>
    </>
  );
};

const Fascia: React.FC<{ lato: LatoSfida; destra: boolean; col: string }> = ({ lato, destra, col }) => {
  const a = squadra(lato.id);
  const ultimo = lato.posizione === 8;
  const primo = lato.posizione === 1;
  return (
    <div
      style={{
        position: "absolute",
        top: 1000,
        [destra ? "right" : "left"]: 0,
        width: 540,
        height: 350,
        display: "flex",
        flexDirection: destra ? "row-reverse" : "row",
        alignItems: "flex-end",
      }}
    >
      <div style={{ width: 210, height: 300, flexShrink: 0, position: "relative", margin: destra ? "0 4px 0 0" : "0 0 0 4px" }}>
        <AvatarAllenatore allenatore={a} emozione="grinta" size={210} effetti={false} />
      </div>
      <div style={{ flex: 1, padding: "0 14px 46px", textAlign: destra ? "right" : "left" }}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontStyle: "italic",
            textTransform: "uppercase",
            fontSize: a.squadra.length > 14 ? 40 : 50,
            lineHeight: 0.95,
            color: C.ink,
            textShadow: `0 4px 0 ${conAlpha(col, 0.9)}, 0 10px 30px rgba(0,0,0,0.6)`,
          }}
        >
          {a.squadra}
        </div>
        {lato.posizione != null && (
          <div
            style={{
              display: "inline-block",
              marginTop: 14,
              fontFamily: FONT,
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: 26,
              padding: "8px 14px",
              borderRadius: 8,
              transform: "skewX(-8deg)",
              background: primo ? C.gold : ultimo ? C.red : col,
              color: primo ? "#1a1000" : ultimo ? "#fff" : testoSu(col),
              border: "2px solid rgba(255,255,255,0.85)",
            }}
          >
            {lato.posizione}° POSTO · {lato.punti ?? 0} PT
          </div>
        )}
        <div style={{ marginTop: 10, fontFamily: FONT, fontWeight: 700, fontSize: 22, color: C.mute }}>Mister {a.nome}</div>
      </div>
    </div>
  );
};

export const Sfida: React.FC<SfidaProps> = ({ lega: nomeLega = "Ciempions Fig", giornata, indice, totale = 4, casa, trasferta }) => {
  const A = squadra(casa.id);
  const B = squadra(trasferta.id);
  let colA = accendi(A.colori.primario, 0.3);
  let colB = accendi(B.colori.primario, 0.3);
  if (colA.toLowerCase() === colB.toLowerCase()) colB = accendi(B.colori.secondario, 0.3);

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      {/* metà diagonali con i colori delle squadre */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${colA} 0%, ${conAlpha(colA, 0.35)} 70%)`, clipPath: "polygon(0 0, 56% 0, 44% 100%, 0 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(200deg, ${colB} 0%, ${conAlpha(colB, 0.35)} 70%)`, clipPath: "polygon(56% 0, 100% 0, 100% 100%, 44% 100%)" }} />
      {/* fasci di luce da stadio */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 20% 0%, rgba(255,255,255,0.35), transparent 70%), radial-gradient(ellipse 60% 40% at 80% 0%, rgba(255,255,255,0.35), transparent 70%)",
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,7,13,0.55) 0%, rgba(6,7,13,0.05) 30%, rgba(6,7,13,0.15) 62%, rgba(6,7,13,0.97) 82%)" }} />
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,0.045) 0 2px, transparent 2px 46px)" }} />
      {/* lampo centrale */}
      <div style={{ position: "absolute", left: "50%", top: 120, height: 900, width: 8, background: "#fff", transform: "translateX(-50%) skewX(-7deg)", boxShadow: "0 0 40px #fff, 0 0 90px #fff" }} />

      {/* intestazione */}
      <div style={{ position: "absolute", top: 34, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: 9, color: C.ink, opacity: 0.9, textTransform: "uppercase" }}>
          {nomeLega} · Giornata {giornata}
        </div>
        <div style={{ marginTop: 8, fontWeight: 900, fontStyle: "italic", fontSize: 40, color: C.lime, letterSpacing: 2, textShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
          SFIDA {indice + 1} DI {totale}
        </div>
      </div>

      <Gruppo lato={casa} destra={false} col={colA} />
      <Gruppo lato={trasferta} destra col={colB} />

      {/* VS */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 600,
          transform: "translate(-50%, -50%) rotate(-8deg)",
          fontFamily: FONT,
          fontWeight: 900,
          fontStyle: "italic",
          fontSize: 170,
          color: "#fff",
          WebkitTextStroke: "6px #0A0C16",
          textShadow: `0 0 40px ${C.lime}, 0 12px 0 #0A0C16`,
          lineHeight: 1,
        }}
      >
        VS
      </div>

      <Fascia lato={casa} destra={false} col={colA} />
      <Fascia lato={trasferta} destra col={colB} />
    </AbsoluteFill>
  );
};
