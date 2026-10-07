import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BadgeGiocatore, Pallone, Titolone } from "../components/Grafica";
import type { AnalisiScontro, Evento } from "../lib/fanta";
import { formatVoto } from "../lib/fanta";
import { DUR } from "../lib/timeline";
import { C, FONT, accendi, conAlpha, testoSu } from "../theme";

// Micro-animazioni dei calciatori: ogni tipo di evento ha la sua "coreografia"
// sopra il badge statico del giocatore.

const TITOLI_GOL = ["GOL!", "DOPPIETTA!", "TRIPLETTA!", "POKER!", "MANITA!"];

const testiEvento = (e: Evento): { titolo: string; sotto: string; colore: string } => {
  switch (e.tipo) {
    case "gol":
      return {
        titolo: TITOLI_GOL[Math.min(e.quantita, 5) - 1],
        sotto: [e.giocatore.rigoreSegnato ? "su rigore" : "", e.assistDa ? `assist di ${e.assistDa}` : ""].filter(Boolean).join(" · "),
        colore: C.lime,
      };
    case "rigoreParato":
      return { titolo: "RIGORE PARATO!", sotto: "muro invalicabile", colore: C.gold };
    case "rigoreSbagliato":
      return { titolo: "ALLE STELLE…", sotto: "rigore sbagliato", colore: C.red };
    case "rosso":
      return { titolo: "ROSSO!", sotto: "doccia anticipata", colore: C.red };
    case "giallo":
      return { titolo: "AMMONITO", sotto: "-0,5 al fantavoto", colore: C.yellow };
    case "autogol":
      return { titolo: "AUTOGOL", sotto: "complimenti vivissimi", colore: C.red };
    case "disastro":
      return { titolo: "DISASTRO", sotto: `voto ${formatVoto(e.giocatore.voto)}`, colore: C.red };
  }
};

const Cartellino: React.FC<{ colore: string; f: number }> = ({ colore, f }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 8, fps, config: { damping: 10, stiffness: 140 } });
  return (
    <div
      style={{
        position: "absolute",
        right: 150,
        top: interpolate(s, [0, 1], [-400, 470]),
        width: 170,
        height: 240,
        borderRadius: 16,
        background: colore,
        boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
        transform: `rotate(${interpolate(s, [0, 1], [-60, 14])}deg)`,
        border: "4px solid rgba(255,255,255,0.4)",
      }}
    />
  );
};

const CartaEvento: React.FC<{ e: Evento; a: AnalisiScontro; n: number; tot: number }> = ({ e, a, n, tot }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const team = e.lato === "casa" ? a.casa : a.trasferta;
  const col = accendi(team.allenatore.colori.primario);
  const { titolo, sotto, colore } = testiEvento(e);

  const pop = spring({ frame: f, fps, config: { damping: 9, stiffness: 160 } });
  const stamp = spring({ frame: f - 10, fps, config: { damping: 12, stiffness: 200 } });
  const sub = spring({ frame: f - 20, fps, config: { damping: 18 } });
  const out = interpolate(f, [DUR.evento - 8, DUR.evento], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // coreografie del badge
  let bx = 0,
    by = 0,
    brot = 0,
    grigio = 0,
    bscale = interpolate(pop, [0, 1], [0.3, 1]);
  if (e.tipo === "rigoreParato") bx = f > 6 && f < 26 ? Math.sin(f * 1.6) * 26 : 0;
  if (e.tipo === "rosso" || e.tipo === "giallo") grigio = interpolate(f, [16, 30], [0, e.tipo === "rosso" ? 1 : 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (e.tipo === "autogol") brot = interpolate(f, [0, 22], [0, 720], { extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  if (e.tipo === "disastro") {
    grigio = interpolate(f, [8, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    brot = interpolate(f, [10, 30], [0, 16], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    by = interpolate(f, [10, 30], [0, 40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }
  if (e.tipo === "gol") by = f > 10 && f < 40 ? -Math.abs(Math.sin((f - 10) / 4)) * 30 * (1 - (f - 10) / 30) : 0;

  const flash = e.tipo === "gol" ? interpolate(f, [8, 10, 20], [0, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `scale(${1 + out * 0.08})` }}>
      {/* raggio di colore squadra */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 38%, ${conAlpha(col, 0.55)}, transparent 55%)`,
          opacity: pop,
        }}
      />
      {/* striscia squadra */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 60px",
          fontFamily: FONT,
          color: C.ink,
        }}
      >
        <div
          style={{
            background: col,
            color: testoSu(col),
            padding: "12px 26px",
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: 38,
            transform: `skewX(-10deg) translateX(${(1 - pop) * -400}px)`,
          }}
        >
          {team.allenatore.squadra.toUpperCase()}
        </div>
        <div style={{ fontWeight: 800, fontSize: 28, letterSpacing: 3, color: C.mute }}>
          {n}/{tot}
        </div>
      </div>

      {/* pallone per il gol / rigore sbagliato */}
      {e.tipo === "gol" &&
        Array.from({ length: e.quantita }).map((_, i) => {
          const s = spring({ frame: f - 14 - i * 5, fps, config: { damping: 12 } });
          const tot = e.quantita;
          const x = 540 + (i - (tot - 1) / 2) * 110;
          return (
            <div key={i} style={{ position: "absolute", left: x - 45, top: 1000, transform: `scale(${s}) rotate(${s * 360}deg)` }}>
              <Pallone size={90} />
            </div>
          );
        })}
      {e.tipo === "rigoreSbagliato" && (
        <div
          style={{
            position: "absolute",
            left: interpolate(f, [4, 28], [500, 820], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            top: interpolate(f, [4, 28], [900, -200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          <Pallone size={120} rot={f * 25} />
        </div>
      )}
      {e.tipo === "rosso" && <Cartellino colore={C.red} f={f} />}
      {e.tipo === "giallo" && <Cartellino colore={C.yellow} f={f} />}
      {e.tipo === "rigoreParato" && (
        <div
          style={{
            position: "absolute",
            left: 540 - 300,
            top: 380,
            width: 600,
            height: 600,
            borderRadius: "50%",
            border: `14px solid ${C.gold}`,
            opacity: interpolate(f, [6, 30], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `scale(${interpolate(f, [6, 30], [0.8, 1.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
          }}
        />
      )}

      {/* badge */}
      <div
        style={{
          position: "absolute",
          left: 540 - 230,
          top: 450,
          transform: `translate(${bx}px, ${by}px) rotate(${brot}deg) scale(${bscale})`,
        }}
      >
        <BadgeGiocatore giocatore={e.giocatore} colore={team.allenatore.colori.primario} size={460} grigio={grigio} />
      </div>

      {/* voto stampato per il disastro */}
      {e.tipo === "disastro" && (
        <div
          style={{
            position: "absolute",
            left: 640,
            top: 420,
            transform: `scale(${interpolate(stamp, [0, 1], [3, 1])}) rotate(12deg)`,
            opacity: stamp,
            border: `10px solid ${C.red}`,
            borderRadius: 24,
            padding: "4px 30px",
          }}
        >
          <Titolone size={170} color={C.red}>
            {formatVoto(e.giocatore.voto)}
          </Titolone>
        </div>
      )}

      {/* nome giocatore */}
      <div style={{ position: "absolute", top: 1110, width: "100%", textAlign: "center", opacity: sub }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 52, color: C.ink }}>{e.giocatore.nome}</div>
      </div>

      {/* titolo evento */}
      <div
        style={{
          position: "absolute",
          top: 1190,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          transform: `scale(${interpolate(stamp, [0, 1], [2.4, 1])}) rotate(-5deg)`,
          opacity: Math.min(1, stamp * 2),
        }}
      >
        <Titolone
          size={Math.min(170, Math.floor(960 / (0.62 * titolo.length)))}
          color={colore}
          style={{ whiteSpace: "nowrap", textShadow: `0 0 50px ${conAlpha(colore, 0.5)}, 0 14px 0 rgba(0,0,0,0.6)` }}
        >
          {titolo}
        </Titolone>
      </div>

      {/* sottotitolo + fantavoto */}
      <div
        style={{
          position: "absolute",
          top: 1440,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26,
          opacity: sub,
          transform: `translateY(${(1 - sub) * 40}px)`,
        }}
      >
        {sotto && <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 42, color: C.ink, opacity: 0.85 }}>{sotto}</div>}
        <div style={{ display: "flex", gap: 16, fontFamily: FONT, fontWeight: 900, fontSize: 36 }}>
          <span style={{ background: "rgba(255,255,255,0.12)", padding: "10px 20px", color: C.ink }}>VOTO {formatVoto(e.giocatore.voto)}</span>
          <span style={{ background: colore, padding: "10px 20px", color: "#0A0C16" }}>FV {formatVoto(e.giocatore.fantavoto)}</span>
        </div>
      </div>

      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};

export const Momenti: React.FC<{ a: AnalisiScontro }> = ({ a }) => {
  if (a.eventi.length === 0) {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Titolone size={110} style={{ textAlign: "center" }}>
          Zero emozioni.
          <br />
          Partita soporifera.
        </Titolone>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      {a.eventi.map((e, i) => (
        <Sequence key={i} from={i * DUR.evento} durationInFrames={DUR.evento} name={`${e.tipo} ${e.giocatore.nome}`}>
          <CartaEvento e={e} a={a} n={i + 1} tot={a.eventi.length} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
