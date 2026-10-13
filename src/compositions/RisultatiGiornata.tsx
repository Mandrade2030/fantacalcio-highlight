import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { AvatarAllenatore } from "../components/Allenatore";
import lega from "../data/lega.json";
import type { Allenatore, Emozione } from "../data/types";
import { C, FONT, accendi, conAlpha } from "../theme";

// Riepilogo di fine giornata (1080x1920): i 4 risultati con i presidenti "in emozione"
// e la classifica aggiornata (con movimenti e punti presi nella giornata).

export interface RisultatoScontro {
  casa: string;
  trasferta: string;
  golCasa: number;
  golTrasferta: number;
  ptCasa: number;
  ptTrasferta: number;
}
export interface RigaClassifica {
  id: string;
  posizione: number;
  punti: number;
  /** posizione prima della giornata (per la freccia) */
  prima?: number;
  /** punti presi in questa giornata (3/1/0) */
  presi?: number;
  /** fantapunti totali */
  fp?: number;
}
export interface RisultatiProps {
  lega?: string;
  giornata: number;
  risultati: RisultatoScontro[];
  classifica: RigaClassifica[];
  [key: string]: unknown;
}

const squadra = (id: string): Allenatore => {
  const s = (lega as any).squadre.find((x: any) => x.id === id);
  if (!s) throw new Error(`Squadra sconosciuta: ${id}`);
  return { ...s, nome: s.persona?.nome || s.presidente, squadra: s.nome } as Allenatore;
};
const emozione = (fatti: number, subiti: number): Emozione => {
  const d = fatti - subiti;
  if (d > 0) return "esultanza";
  if (d === 0) return "neutro";
  if (d === -1) return "rabbia";
  if (d === -2) return "tristezza";
  return "pianto";
};
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace(".", ",");

const TOP = 262;
const RH = 226;

const Lato: React.FC<{ id: string; gol: number; contro: number; pt: number; destra: boolean; col: string; y: number }> = ({ id, gol, contro, pt, destra, col, y }) => {
  const a = squadra(id);
  const vince = gol > contro;
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        [destra ? "right" : "left"]: 0,
        width: 400,
        height: RH - 10,
        display: "flex",
        flexDirection: destra ? "row-reverse" : "row",
        alignItems: "flex-end",
      }}
    >
      <div style={{ width: 170, height: RH - 14, flexShrink: 0, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", bottom: -6, [destra ? "right" : "left"]: 4 }}>
          <AvatarAllenatore allenatore={a} emozione={emozione(gol, contro)} size={168} effetti={false} flip={destra} />
        </div>
      </div>
      <div style={{ flex: 1, padding: destra ? "0 10px 26px 0" : "0 0 26px 10px", textAlign: destra ? "right" : "left" }}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontStyle: "italic",
            textTransform: "uppercase",
            fontSize: a.squadra.length > 12 ? 27 : 33,
            lineHeight: 0.98,
            color: C.ink,
            textShadow: `0 3px 0 ${conAlpha(col, 0.95)}, 0 6px 16px rgba(0,0,0,0.7)`,
          }}
        >
          {a.squadra}
        </div>
        <div style={{ marginTop: 8, fontFamily: FONT, fontWeight: 800, fontSize: 22, color: vince ? C.lime : "rgba(255,255,255,0.75)" }}>
          {fmt(pt)} fp
        </div>
        <div style={{ marginTop: 2, fontFamily: FONT, fontWeight: 700, fontSize: 18, color: C.mute }}>Mister {a.nome}</div>
      </div>
    </div>
  );
};

const Freccia: React.FC<{ prima?: number; ora: number }> = ({ prima, ora }) => {
  if (prima == null || prima === ora) return <span style={{ color: C.mute, fontSize: 22, width: 46, textAlign: "center" }}>=</span>;
  const su = ora < prima;
  return (
    <span style={{ color: su ? C.lime : C.red, fontSize: 20, fontWeight: 900, width: 46, textAlign: "center", whiteSpace: "nowrap" }}>
      {su ? "▲" : "▼"}
      {Math.abs(prima - ora)}
    </span>
  );
};

export const RisultatiGiornata: React.FC<RisultatiProps> = ({ lega: nomeLega = "Ciempions Fig", giornata, risultati, classifica }) => {
  const ordinata = [...classifica].sort((a, b) => a.posizione - b.posizione);
  const yClass = TOP + 4 * RH + 34;
  const rigaH = 74;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 28% at 50% 0%, rgba(198,255,46,0.2), transparent 70%)" }} />

      {/* intestazione */}
      <div style={{ position: "absolute", top: 46, width: "100%", textAlign: "center", fontFamily: FONT }}>
        <div style={{ fontWeight: 800, fontSize: 28, letterSpacing: 10, color: C.ink, opacity: 0.85, textTransform: "uppercase" }}>{nomeLega}</div>
        <div style={{ marginTop: 4, fontWeight: 900, fontStyle: "italic", fontSize: 104, lineHeight: 1, color: C.ink, textTransform: "uppercase", textShadow: `0 6px 0 ${C.lime}, 0 14px 40px rgba(0,0,0,0.7)` }}>
          Giornata {giornata}
        </div>
        <div style={{ marginTop: 14, display: "inline-block", fontWeight: 900, fontStyle: "italic", fontSize: 30, letterSpacing: 4, padding: "6px 18px", background: C.lime, color: "#0A0C16", transform: "skewX(-8deg)", borderRadius: 6 }}>
          RISULTATI FINALI
        </div>
      </div>

      {risultati.slice(0, 4).map((r, i) => {
        const A = squadra(r.casa);
        const B = squadra(r.trasferta);
        const colA = accendi(A.colori.primario, 0.3);
        let colB = accendi(B.colori.primario, 0.3);
        if (colA.toLowerCase() === colB.toLowerCase()) colB = accendi(B.colori.secondario, 0.3);
        const y = TOP + i * RH;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: 0, right: 0, top: y, height: RH - 10, background: `linear-gradient(100deg, ${colA} 0%, ${conAlpha(colA, 0.25)} 40%, transparent 50%)`, clipPath: "polygon(0 0, 53% 0, 47% 100%, 0 100%)" }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: y, height: RH - 10, background: `linear-gradient(260deg, ${colB} 0%, ${conAlpha(colB, 0.25)} 40%, transparent 50%)`, clipPath: "polygon(53% 0, 100% 0, 100% 100%, 47% 100%)" }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: y, height: RH - 10, background: "linear-gradient(180deg, rgba(6,7,13,0.1) 0%, rgba(6,7,13,0.75) 100%)" }} />

            <Lato id={r.casa} gol={r.golCasa} contro={r.golTrasferta} pt={r.ptCasa} destra={false} col={colA} y={y} />
            <Lato id={r.trasferta} gol={r.golTrasferta} contro={r.golCasa} pt={r.ptTrasferta} destra col={colB} y={y} />

            {/* punteggio */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: y + (RH - 10) / 2,
                transform: "translate(-50%, -50%)",
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontFamily: FONT,
                fontWeight: 900,
                fontStyle: "italic",
                fontSize: 96,
                lineHeight: 1,
                padding: "10px 26px",
                background: "rgba(8,10,20,0.92)",
                border: "3px solid rgba(255,255,255,0.9)",
                borderRadius: 16,
                boxShadow: `0 0 30px rgba(0,0,0,0.6)`,
              }}
            >
              <span style={{ color: r.golCasa >= r.golTrasferta ? C.ink : "rgba(255,255,255,0.55)" }}>{r.golCasa}</span>
              <span style={{ color: C.lime, fontSize: 70 }}>-</span>
              <span style={{ color: r.golTrasferta >= r.golCasa ? C.ink : "rgba(255,255,255,0.55)" }}>{r.golTrasferta}</span>
            </div>
          </React.Fragment>
        );
      })}

      {/* classifica */}
      <div style={{ position: "absolute", left: 40, right: 40, top: yClass, fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontStyle: "italic", fontSize: 44, color: C.ink, textTransform: "uppercase", textShadow: `0 4px 0 ${C.lime}` }}>Classifica</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: C.mute, letterSpacing: 2 }}>PT · FANTAPUNTI</div>
        </div>
        {ordinata.map((r, i) => {
          const s = squadra(r.id);
          const col = accendi(s.colori.primario, 0.3);
          const primo = r.posizione === 1;
          const ultimo = r.posizione === ordinata.length;
          return (
            <div
              key={r.id}
              style={{
                height: rigaH - 8,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "0 18px 0 0",
                borderRadius: 12,
                background: i % 2 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.09)",
                borderLeft: `8px solid ${col}`,
              }}
            >
              <div
                style={{
                  width: 62,
                  textAlign: "center",
                  fontWeight: 900,
                  fontStyle: "italic",
                  fontSize: 36,
                  color: primo ? C.gold : ultimo ? C.red : C.ink,
                }}
              >
                {r.posizione}
              </div>
              <Freccia prima={r.prima} ora={r.posizione} />
              <Img src={staticFile(`loghi/${r.id}.png`)} style={{ width: 50, height: 50, objectFit: "contain", borderRadius: 25 }} />
              <div style={{ flex: 1, fontWeight: 900, fontStyle: "italic", fontSize: 30, color: C.ink, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {s.squadra}
                <span style={{ marginLeft: 12, fontWeight: 700, fontStyle: "normal", fontSize: 18, color: C.mute, textTransform: "none" }}>{s.nome}</span>
              </div>
              {r.presi != null && (
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 20,
                    padding: "4px 10px",
                    borderRadius: 8,
                    background: r.presi === 3 ? C.lime : r.presi === 1 ? "rgba(255,255,255,0.25)" : "rgba(255,80,80,0.25)",
                    color: r.presi === 3 ? "#0A0C16" : C.ink,
                  }}
                >
                  +{r.presi}
                </div>
              )}
              <div style={{ width: 64, textAlign: "right", fontWeight: 900, fontSize: 40, color: primo ? C.gold : C.ink }}>{r.punti}</div>
              {r.fp != null && <div style={{ width: 92, textAlign: "right", fontWeight: 700, fontSize: 22, color: C.mute }}>{fmt(r.fp)}</div>}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
