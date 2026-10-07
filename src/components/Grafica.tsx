import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Giocatore } from "../data/types";
import { iniziali } from "../lib/fanta";
import { C, COLORE_RUOLO, FONT, accendi, conAlpha } from "../theme";

/* ---------- Sfondo animato con i colori delle due squadre ---------- */
export const Sfondo: React.FC<{ colA: string; colB: string; intensita?: number }> = ({ colA, colB, intensita = 1 }) => {
  const f = useCurrentFrame();
  const shift = (f * 1.6) % 160;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 900px at 0% ${18 + Math.sin(f / 40) * 4}%, ${conAlpha(accendi(colA), 0.42 * intensita)}, transparent 70%),
             radial-gradient(900px 900px at 100% ${82 + Math.cos(f / 45) * 4}%, ${conAlpha(accendi(colB), 0.42 * intensita)}, transparent 70%)`,
        }}
      />
      {/* righe diagonali in movimento */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(115deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 2px, transparent 2px, transparent 80px)`,
          backgroundPosition: `${shift}px 0px`,
        }}
      />
      {/* vignettatura */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.7) 100%)" }} />
      {/* grana */}
      <AbsoluteFill style={{ opacity: 0.08, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id="grana">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(f / 2) % 8} />
          </filter>
          <rect width="100%" height="100%" filter="url(#grana)" />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- Transizione a "taglio" diagonale ---------- */
export const Taglio: React.FC<{ colA: string; colB: string; durata: number }> = ({ colA, colB, durata }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, durata], [0, 1], { extrapolateRight: "clamp" });
  const band = (delay: number, col: string, w: number) => {
    const x = interpolate(p, [delay, delay + 0.7], [-160, 160], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <div
        style={{
          position: "absolute",
          top: "-20%",
          height: "140%",
          left: `${x - w / 2}%`,
          width: `${w}%`,
          background: col,
          transform: "skewX(-18deg)",
        }}
      />
    );
  };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {band(0, accendi(colA), 70)}
      {band(0.12, accendi(colB), 55)}
      {band(0.22, "#fff", 12)}
    </AbsoluteFill>
  );
};

/* ---------- Badge del calciatore (foto o iniziali) ---------- */
export const BadgeGiocatore: React.FC<{
  giocatore: Giocatore;
  colore: string;
  size: number;
  grigio?: number; // 0..1
}> = ({ giocatore, colore, size, grigio = 0 }) => {
  const col = accendi(colore);
  const src = giocatore.immagine
    ? giocatore.immagine.startsWith("http")
      ? giocatore.immagine
      : staticFile(giocatore.immagine)
    : null;
  return (
    <div style={{ width: size, height: size, position: "relative", filter: `grayscale(${grigio})` }}>
      {src && (
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", zIndex: 0 }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 35%, rgba(255,255,255,0.25), transparent 60%)` }} />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `linear-gradient(145deg, ${col}, ${conAlpha(colore, 0.55)} 60%, #0b0d18)`,
          boxShadow: `0 0 0 ${size * 0.03}px #fff, 0 0 ${size * 0.25}px ${conAlpha(col, 0.7)}`,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {src ? null : (
          <span
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: size * 0.36,
              color: "#fff",
              letterSpacing: -size * 0.01,
              textShadow: "0 6px 20px rgba(0,0,0,0.4)",
            }}
          >
            {iniziali(giocatore.nome)}
          </span>
        )}
      </div>
      {src && (
        // figurina ufficiale (campioncino): esce dal cerchio verso l'alto
        <Img
          src={src}
          style={{
            position: "absolute",
            left: "-14%",
            width: "128%",
            height: "128%",
            bottom: "-2%",
            objectFit: "contain",
            objectPosition: "50% 100%",
            filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.55))",
            clipPath: "inset(0 0 3% 0 round 0 0 50% 50%)",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          right: size * 0.02,
          bottom: size * 0.02,
          width: size * 0.26,
          height: size * 0.26,
          borderRadius: "50%",
          background: COLORE_RUOLO[giocatore.ruolo],
          border: `${size * 0.02}px solid #fff`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: size * 0.13,
          color: "#fff",
        }}
      >
        {giocatore.ruolo}
      </div>
    </div>
  );
};

/* ---------- Stemma della squadra ---------- */
export const Stemma: React.FC<{ src?: string; size: number; style?: React.CSSProperties }> = ({ src, size, style }) => {
  if (!src) return null;
  return (
    <Img
      src={src.startsWith("http") ? src : staticFile(src)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        boxShadow: `0 0 0 ${Math.max(3, size * 0.04)}px rgba(255,255,255,0.9), 0 10px 30px rgba(0,0,0,0.5)`,
        ...style,
      }}
    />
  );
};

/* ---------- Pallone ---------- */
export const Pallone: React.FC<{ size: number; rot?: number }> = ({ size, rot = 0 }) => (
  <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ transform: `rotate(${rot}deg)` }}>
    <circle r={48} fill="#fff" stroke="#111" strokeWidth={3} />
    <polygon points="0,-16 15,-5 9,13 -9,13 -15,-5" fill="#111" />
    {[0, 72, 144, 216, 288].map((a) => (
      <g key={a} transform={`rotate(${a})`}>
        <line x1={0} y1={-16} x2={0} y2={-34} stroke="#111" strokeWidth={3} />
        <polygon points="-11,-46 11,-46 15,-36 0,-30 -15,-36" fill="#111" />
      </g>
    ))}
  </svg>
);

/* ---------- Coriandoli deterministici ---------- */
export const Coriandoli: React.FC<{ colori: string[]; quanti?: number; da?: number }> = ({ colori, quanti = 70, da = 0 }) => {
  const f = useCurrentFrame() - da;
  const { width, height } = useVideoConfig();
  if (f < 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: quanti }).map((_, i) => {
        const r1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
        const r2 = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1;
        const r3 = Math.abs(Math.sin(i * 39.425) * 9876.543) % 1;
        const x = r1 * width + Math.sin((f + i * 7) / 12) * 40;
        const y = -60 + ((f * (6 + r2 * 9) + r3 * height * 0.6) % (height + 120));
        const col = colori[i % colori.length];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 14 + r2 * 14,
              height: 8 + r3 * 10,
              background: col,
              transform: `rotate(${(f * (4 + r1 * 8) + i * 40) % 360}deg) scaleX(${Math.cos((f + i) / 5)})`,
              borderRadius: 2,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* ---------- Barra telecronaca con effetto macchina da scrivere ---------- */
export const BarraTelecronaca: React.FC<{ testo: string; colore: string; da?: number; y?: number }> = ({
  testo,
  colore,
  da = 0,
  y = 1520,
}) => {
  const f = useCurrentFrame() - da;
  const { fps } = useVideoConfig();
  if (f < 0) return null;
  const ingresso = spring({ frame: f, fps, config: { damping: 16, stiffness: 140 } });
  const caratteri = Math.floor(Math.max(0, f - 6) * 1.6);
  const visibile = testo.slice(0, caratteri);
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: y,
        transform: `translateX(${(1 - ingresso) * -1100}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <div
        style={{
          alignSelf: "flex-start",
          background: accendi(colore),
          color: "#fff",
          fontFamily: FONT,
          fontWeight: 900,
          fontStyle: "italic",
          fontSize: 26,
          letterSpacing: 3,
          padding: "8px 18px",
          textTransform: "uppercase",
        }}
      >
        Telecronaca
      </div>
      <div
        style={{
          background: "rgba(255,255,255,0.96)",
          color: "#0A0C16",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 44,
          lineHeight: 1.22,
          padding: "26px 30px",
          minHeight: 120,
          boxShadow: `10px 10px 0 ${conAlpha(accendi(colore), 0.9)}`,
        }}
      >
        {visibile}
        {caratteri < testo.length && <span style={{ opacity: f % 10 < 5 ? 1 : 0 }}>▍</span>}
      </div>
    </div>
  );
};

/* ---------- Testata in alto ---------- */
export const Testata: React.FC<{ lega: string; giornata: number; titolo: string }> = ({ lega, giornata, titolo }) => (
  <div
    style={{
      position: "absolute",
      top: 70,
      left: 60,
      right: 60,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontFamily: FONT,
      color: C.ink,
      fontSize: 28,
      fontWeight: 800,
      letterSpacing: 3,
      textTransform: "uppercase",
    }}
  >
    <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ width: 14, height: 14, borderRadius: 7, background: C.red, boxShadow: `0 0 16px ${C.red}` }} />
      {lega}
    </span>
    <span style={{ opacity: 0.75 }}>
      G{giornata} · {titolo}
    </span>
  </div>
);

/* ---------- Testo grande in stile grafica TV ---------- */
export const Titolone: React.FC<{
  children: React.ReactNode;
  size: number;
  color?: string;
  stroke?: boolean;
  style?: React.CSSProperties;
}> = ({ children, size, color = C.ink, stroke = false, style }) => (
  <div
    style={{
      fontFamily: FONT,
      fontWeight: 900,
      fontStyle: "italic",
      fontSize: size,
      lineHeight: 0.92,
      letterSpacing: -size * 0.02,
      textTransform: "uppercase",
      color: stroke ? "transparent" : color,
      WebkitTextStroke: stroke ? `${Math.max(2, size / 40)}px ${color}` : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);
