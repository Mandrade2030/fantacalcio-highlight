import React, { useMemo } from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import type { Allenatore as TAllenatore, Emozione, StileAvatar } from "../data/types";

// Avatar dell'allenatore: ritratto vettoriale (SVG) semi-realistico, con luci e ombre, regolato
// sul volto di ciascun presidente (forma del viso, capelli, barba, occhiali, colori, vestiti)
// e 6 emozioni animate. Se in allenatore.immagini ci sono dei PNG si usano quelli, con le stesse animazioni.

/* ------------------------------------------------------------------ */
/* colori                                                              */
/* ------------------------------------------------------------------ */
const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (c: number[]) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a);
  const B = rgb(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
};
/** k < 1 scurisce, k > 1 schiarisce */
const sh = (hex: string, k: number) => (k <= 1 ? mix(hex, "#000000", 1 - k) : mix(hex, "#ffffff", k - 1));
const INK = "#1A1214";

const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const seme = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/* ------------------------------------------------------------------ */
/* geometria del viso                                                  */
/* ------------------------------------------------------------------ */
const CY = 126;
interface Geo {
  W: number;
  H: number;
  Wj: number;
  Wc: number;
  top: number;
  chin: number;
  sep: number;
  yOcchi: number;
  yNaso: number;
  yBocca: number;
  yBrow: number;
  guance: number;
  path: string;
}
const geometria = (st: StileAvatar): Geo => {
  const v = st.viso ?? {};
  const W = 52 * (v.larghezza ?? 1);
  const H = 64 * (v.altezza ?? 1);
  const Wj = W * (v.mascella ?? 0.82);
  const Wc = W * (v.mento ?? 0.42);
  const top = CY - H;
  const chin = CY + H;
  const g = v.guance ?? 1;
  const L = (x: number) => 120 - x;
  const R = (x: number) => 120 + x;
  const path =
    `M120 ${top} ` +
    `C${R(W * 0.58)} ${top} ${R(W)} ${top + H * 0.2} ${R(W)} ${CY - 6} ` +
    `C${R(W)} ${CY + H * 0.3} ${R(Wj * g + 4)} ${CY + H * 0.46} ${R(Wj)} ${CY + H * 0.6} ` +
    `C${R(Wj - 5)} ${CY + H * 0.82} ${R(Wc + 12)} ${chin} 120 ${chin} ` +
    `C${L(Wc + 12)} ${chin} ${L(Wj - 5)} ${CY + H * 0.82} ${L(Wj)} ${CY + H * 0.6} ` +
    `C${L(Wj * g + 4)} ${CY + H * 0.46} ${L(W)} ${CY + H * 0.3} ${L(W)} ${CY - 6} ` +
    `C${L(W)} ${top + H * 0.2} ${L(W * 0.58)} ${top} 120 ${top} Z`;
  return {
    W,
    H,
    Wj,
    Wc,
    top,
    chin,
    sep: 21.5 * (v.larghezza ?? 1),
    yOcchi: CY + 2,
    yNaso: CY + H * 0.34,
    yBocca: CY + H * 0.63,
    yBrow: CY - 12,
    guance: g,
    path,
  };
};

const SOPRACCIGLIA: Record<Emozione, [number, number]> = {
  // [offset estremo esterno, offset estremo interno] in px (negativo = su)
  neutro: [0, 0],
  esultanza: [-7, -6],
  tristezza: [4, -8],
  pianto: [5, -10],
  rabbia: [-3, 7],
  grinta: [-1, 4],
};

/* ------------------------------------------------------------------ */
/* occhi, sopracciglia, naso, bocca                                    */
/* ------------------------------------------------------------------ */
const Occhio: React.FC<{
  x: number;
  y: number;
  lato: -1 | 1;
  emo: Emozione;
  blink: number;
  pelle: string;
  iride: string;
  id: string;
  sguardo?: number;
}> = ({ x, y, lato, emo, blink, pelle, iride, id, sguardo = 0 }) => {
  const ombra = sh(pelle, 0.72);
  const chiuso = emo === "esultanza" || emo === "pianto";
  if (chiuso) {
    const su = emo === "esultanza";
    const d = su ? `M${x - 10} ${y + 3} Q${x} ${y - 9} ${x + 10} ${y + 3}` : `M${x - 10} ${y - 1} Q${x} ${y + 7} ${x + 10} ${y - 1}`;
    return (
      <g>
        <path d={d} stroke={INK} strokeWidth={3.2} fill="none" strokeLinecap="round" />
        {su && <path d={`M${x - 12} ${y - 7} Q${x} ${y - 14} ${x + 12} ${y - 7}`} stroke={ombra} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.7} />}
      </g>
    );
  }
  // quanto le palpebre coprono l'occhio: linea inclinata [esterno, interno]
  const [lidOut, lidIn] =
    emo === "rabbia" ? [-3.5, 1.5] : emo === "tristezza" ? [0.5, -3.5] : emo === "grinta" ? [-4.5, -4] : [-8.8, -8.8];
  const so = lato; // lato -1 = occhio sinistro (esterno a sinistra)
  const xo = x + so * 10;
  const xi = x - so * 10;
  const bl = Math.max(blink, 0.08);
  const yA = y + lidOut * bl + (1 - bl) * 8; // coperto dalla palpebra (blink)
  const yB = y + lidIn * bl + (1 - bl) * 8;
  const clip = `${id}-eye-${lato}`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={`M${x - 10.5} ${y + 0.5} Q${x} ${y - 9} ${x + 10.5} ${y + 0.5} Q${x} ${y + 7.2} ${x - 10.5} ${y + 0.5} Z`} />
        </clipPath>
      </defs>
      {/* incavo dell'occhio */}
      <ellipse cx={x} cy={y - 1} rx={13} ry={9.5} fill={ombra} opacity={0.18} />
      <g clipPath={`url(#${clip})`}>
        <rect x={x - 12} y={y - 10} width={24} height={20} fill="#F2EEEA" />
        <circle cx={x + sguardo - so * 0.8} cy={y + 0.8} r={5.3} fill={iride} />
        <circle cx={x + sguardo - so * 0.8} cy={y + 0.8} r={5.3} fill="none" stroke={sh(iride, 0.45)} strokeWidth={1.1} />
        <circle cx={x + sguardo - so * 0.8} cy={y + 0.8} r={2.4} fill="#0B0809" />
        <circle cx={x + sguardo + 1.3 - so * 0.8} cy={y - 1.3} r={1.3} fill="#fff" opacity={0.95} />
        {/* ombra della palpebra sull'occhio */}
        <rect x={x - 12} y={y - 12} width={24} height={9} fill="#000" opacity={0.16} />
        {/* palpebra che scende (rabbia, tristezza, ammiccamento) */}
        <path
          d={`M${xo - so * 2} ${y - 14} L${xo - so * 2} ${yA} L${xi + so * 2} ${yB} L${xi + so * 2} ${y - 14} Z`}
          fill={sh(pelle, 0.96)}
        />
      </g>
      {/* contorno e ciglia */}
      <path
        d={`M${xo} ${yA + 0.4} Q${x} ${Math.min(yA, yB) - 4.2 * bl - 0.6} ${xi} ${yB + 0.4}`}
        stroke={INK}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
      />
      <path d={`M${x - 8.5} ${y + 3.4} Q${x} ${y + 7.8} ${x + 8.5} ${y + 3.4}`} stroke={ombra} strokeWidth={1.1} fill="none" opacity={0.75} />
      {/* piega della palpebra */}
      <path
        d={`M${xo - so * 1} ${yA - 3.6} Q${x} ${Math.min(yA, yB) - 9.5} ${xi + so * 1} ${yB - 3.4}`}
        stroke={ombra}
        strokeWidth={1.3}
        fill="none"
        strokeLinecap="round"
        opacity={0.55}
      />
    </g>
  );
};

const Sopracciglio: React.FC<{
  lato: -1 | 1;
  geo: Geo;
  out: number;
  inn: number;
  spess: number;
  arco: number;
  colore: string;
}> = ({ lato, geo, out, inn, spess, arco, colore }) => {
  const xi = 120 + lato * 7.5;
  const xo = 120 + lato * (geo.sep + 14);
  const yi = geo.yBrow + inn + 2;
  const yo = geo.yBrow + out + 5;
  const xp = xi + (xo - xi) * 0.62;
  const yp = Math.min(yi, yo) - arco - 1.5;
  const t = spess;
  const d =
    `M${xi} ${yi - t * 0.55} ` +
    `Q${xp} ${yp - t * 0.85} ${xo} ${yo - t * 0.15} ` +
    `L${xo - lato * 1} ${yo + t * 0.2} ` +
    `Q${xp} ${yp + t * 0.45} ${xi} ${yi + t * 0.6} Z`;
  return (
    <g>
      <path d={d} fill={colore} stroke={colore} strokeWidth={1.4} strokeLinejoin="round" />
      <path
        d={`M${xi + lato * 4} ${yi - t * 0.25} Q${xp} ${yp - t * 0.5} ${xo - lato * 5} ${yo - t * 0.05}`}
        stroke={sh(colore, 1.5)}
        strokeWidth={0.9}
        fill="none"
        opacity={0.25}
      />
    </g>
  );
};

const Naso: React.FC<{ geo: Geo; pelle: string; larg: number }> = ({ geo, pelle, larg }) => {
  const y = geo.yNaso;
  const wN = 8.5 * larg;
  const ombra = sh(pelle, 0.7);
  const luce = sh(pelle, 1.12);
  return (
    <g>
      {/* ombra laterale del dorso (luce da sinistra) */}
      <path d={`M${120 + 5} ${y - 28} C${120 + 8} ${y - 16} ${120 + wN} ${y - 6} ${120 + wN + 2} ${y + 2} L${120 + 2} ${y + 3} Z`} fill={ombra} opacity={0.22} />
      <path d={`M${120 - 4} ${y - 26} C${120 - 5} ${y - 14} ${120 - 6} ${y - 6} ${120 - wN * 0.8} ${y + 2}`} stroke={luce} strokeWidth={4} fill="none" opacity={0.35} strokeLinecap="round" />
      {/* punta e ali */}
      <ellipse cx={120} cy={y - 1} rx={wN * 0.62} ry={5.6} fill={luce} opacity={0.5} />
      <path d={`M${120 - wN} ${y + 2} C${120 - wN - 3} ${y - 4} ${120 - wN * 0.5} ${y - 6} ${120 - 3} ${y - 3}`} stroke={ombra} strokeWidth={1.6} fill="none" opacity={0.55} strokeLinecap="round" />
      <path d={`M${120 + wN} ${y + 2} C${120 + wN + 3} ${y - 4} ${120 + wN * 0.5} ${y - 6} ${120 + 3} ${y - 3}`} stroke={ombra} strokeWidth={1.6} fill="none" opacity={0.55} strokeLinecap="round" />
      <ellipse cx={120 - wN * 0.5} cy={y + 3} rx={3.2} ry={1.9} fill={sh(pelle, 0.38)} opacity={0.85} />
      <ellipse cx={120 + wN * 0.5} cy={y + 3} rx={3.2} ry={1.9} fill={sh(pelle, 0.38)} opacity={0.85} />
      <path d={`M${120 - wN * 0.9} ${y + 6} Q120 ${y + 9} ${120 + wN * 0.9} ${y + 6}`} stroke={ombra} strokeWidth={1.4} fill="none" opacity={0.35} />
    </g>
  );
};

const Bocca: React.FC<{ emo: Emozione; t: number; geo: Geo; pelle: string; larg: number; barba: boolean }> = ({ emo, t, geo, pelle, larg, barba }) => {
  const y = geo.yBocca;
  const w = 17 * larg;
  const labbro = barba ? mix("#B8685F", pelle, 0.25) : mix("#C2706A", pelle, 0.3);
  const labbroSu = sh(labbro, 0.82);
  const dentro = "#4A1217";
  const denti = "#F7F3EA";
  const L = 120 - w;
  const R = 120 + w;
  switch (emo) {
    case "esultanza":
      return (
        <g>
          <path d={`M${L - 2} ${y - 3} Q120 ${y - 1} ${R + 2} ${y - 3} Q${R - 2} ${y + 25} 120 ${y + 25} Q${L + 2} ${y + 25} ${L - 2} ${y - 3} Z`} fill={dentro} />
          <path d={`M${L - 1} ${y - 2.5} Q120 ${y - 0.5} ${R + 1} ${y - 2.5} L${R - 3} ${y + 8} Q120 ${y + 11} ${L + 3} ${y + 8} Z`} fill={denti} />
          {[-12, -6, 0, 6, 12].map((o) => (
            <line key={o} x1={120 + o} y1={y - 1} x2={120 + o} y2={y + 9} stroke="#D8D1C2" strokeWidth={0.7} />
          ))}
          <ellipse cx={120} cy={y + 19} rx={9} ry={4.8} fill="#D9606B" />
          <path d={`M${L - 4} ${y - 4} Q120 ${y - 3} ${R + 4} ${y - 4}`} stroke={labbroSu} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <path d={`M${L + 2} ${y + 17} Q120 ${y + 28} ${R - 2} ${y + 17}`} stroke={labbro} strokeWidth={3.2} fill="none" strokeLinecap="round" />
        </g>
      );
    case "tristezza":
      return (
        <g>
          <path d={`M${L + 3} ${y + 5} Q120 ${y - 5} ${R - 3} ${y + 5}`} stroke={sh(labbro, 0.65)} strokeWidth={2} fill="none" strokeLinecap="round" />
          <path d={`M${L + 6} ${y + 5.5} Q120 ${y - 2} ${R - 6} ${y + 5.5} Q120 ${y + 11} ${L + 6} ${y + 5.5} Z`} fill={labbro} opacity={0.95} />
          <path d={`M${120 - 6} ${y + 14} Q120 ${y + 11} ${120 + 6} ${y + 14}`} stroke={sh(pelle, 0.75)} strokeWidth={1.4} fill="none" opacity={0.5} />
        </g>
      );
    case "pianto": {
      const o = 2.2 * Math.sin(t / 2.2);
      return (
        <g>
          <path d={`M${L + 1} ${y + 10} Q120 ${y - 12 + o} ${R - 1} ${y + 10} Q120 ${y + 22 + o} ${L + 1} ${y + 10} Z`} fill={dentro} />
          <path d={`M${L + 6} ${y + 5.5} Q120 ${y - 5 + o} ${R - 6} ${y + 5.5} L${R - 8} ${y + 8} Q120 ${y - 1 + o} ${L + 8} ${y + 8} Z`} fill={denti} />
          <ellipse cx={120} cy={y + 15 + o * 0.5} rx={8} ry={3.6} fill="#D9606B" />
          <path d={`M${L} ${y + 10} Q120 ${y - 13 + o} ${R} ${y + 10}`} stroke={labbroSu} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <path d={`M${L + 2} ${y + 12} Q120 ${y + 24 + o} ${R - 2} ${y + 12}`} stroke={labbro} strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      );
    }
    case "rabbia":
      return (
        <g>
          <path d={`M${L + 1} ${y + 2} Q120 ${y - 4} ${R - 1} ${y + 2} L${R - 3} ${y + 12} Q120 ${y + 15} ${L + 3} ${y + 12} Z`} fill={dentro} />
          <path d={`M${L + 3} ${y + 2.5} Q120 ${y - 2.5} ${R - 3} ${y + 2.5} L${R - 4} ${y + 8} L${L + 4} ${y + 8} Z`} fill={denti} />
          <path d={`M${L + 4} ${y + 8} L${R - 4} ${y + 8}`} stroke="#B9B2A4" strokeWidth={0.9} />
          {[-12, -6, 0, 6, 12].map((o) => (
            <line key={o} x1={120 + o} y1={y + 2} x2={120 + o} y2={y + 12} stroke="#B9B2A4" strokeWidth={0.7} />
          ))}
          <path d={`M${L} ${y + 3} Q120 ${y - 5} ${R} ${y + 3}`} stroke={labbroSu} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <path d={`M${L + 2} ${y + 13} Q120 ${y + 17} ${R - 2} ${y + 13}`} stroke={labbro} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </g>
      );
    case "grinta":
      return (
        <g>
          <path d={`M${L + 1} ${y + 3} Q${120 - 3} ${y + 5.5} ${R + 2} ${y - 3}`} stroke={sh(labbro, 0.6)} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <path d={`M${L + 4} ${y + 3.8} Q${120 - 2} ${y + 7} ${R - 2} ${y + 0.5} Q${120} ${y + 11.5} ${L + 4} ${y + 3.8} Z`} fill={labbro} />
          <path d={`M${R + 2} ${y - 3} q4 -1 5 -5`} stroke={sh(pelle, 0.7)} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.55} />
        </g>
      );
    default:
      return (
        <g>
          <path d={`M${L + 2} ${y + 2} Q120 ${y + 7} ${R - 2} ${y + 2}`} stroke={sh(labbro, 0.55)} strokeWidth={1.9} fill="none" strokeLinecap="round" />
          <path d={`M${L + 3} ${y + 2.4} Q${120 - 6} ${y - 2.5} 120 ${y + 0.2} Q${120 + 6} ${y - 2.5} ${R - 3} ${y + 2.4} Q120 ${y + 5.6} ${L + 3} ${y + 2.4} Z`} fill={labbroSu} />
          <path d={`M${L + 4} ${y + 3.2} Q120 ${y + 9} ${R - 4} ${y + 3.2} Q120 ${y + 13.5} ${L + 4} ${y + 3.2} Z`} fill={labbro} />
          <path d={`M${120 - 6} ${y + 5.5} Q120 ${y + 7.5} ${120 + 6} ${y + 5.5}`} stroke={sh(labbro, 1.35)} strokeWidth={1.3} fill="none" opacity={0.6} strokeLinecap="round" />
        </g>
      );
  }
};

/* ------------------------------------------------------------------ */
/* capelli                                                             */
/* ------------------------------------------------------------------ */
const Strand: React.FC<{ n: number; seed: number; cx: number; cy: number; rx: number; ry: number; colore: string; a0?: number; a1?: number; len?: number }> = ({
  n,
  seed,
  cx,
  cy,
  rx,
  ry,
  colore,
  a0 = Math.PI * 1.05,
  a1 = Math.PI * 1.95,
  len = 22,
}) => {
  const r = rng(seed);
  return (
    <g fill="none" strokeLinecap="round">
      {Array.from({ length: n }).map((_, i) => {
        const a = a0 + (a1 - a0) * (i / (n - 1)) + (r() - 0.5) * 0.12;
        const x0 = cx + Math.cos(a) * rx * (0.55 + r() * 0.2);
        const y0 = cy + Math.sin(a) * ry * (0.55 + r() * 0.2);
        const x1 = cx + Math.cos(a + 0.05) * rx * 1.02;
        const y1 = cy + Math.sin(a + 0.05) * ry * 1.02;
        const xm = (x0 + x1) / 2 + (r() - 0.5) * 6;
        const ym = (y0 + y1) / 2 + (r() - 0.5) * 6;
        return <path key={i} d={`M${x0} ${y0} Q${xm} ${ym} ${x1} ${y1}`} stroke={r() > 0.5 ? sh(colore, 1.55) : sh(colore, 0.55)} strokeWidth={1 + r() * 0.9} opacity={0.22 + r() * 0.22} />;
      })}
    </g>
  );
};

const Capelli: React.FC<{ st: StileAvatar; geo: Geo; fronte: boolean; id: string; seed: number; pelle: string }> = ({ st, geo, fronte, id, seed, pelle }) => {
  const c = st.capelli;
  const a = st.acconciatura;
  const W = geo.W;
  const g = `url(#${id}-hair)`;
  const T = geo.top;
  const ombraCranio = st.ombraCranio ?? 0.45;
  if (!fronte) {
    // massa dietro la testa (volume)
    switch (a) {
      case "mossi":
        return <ellipse cx={120} cy={T + 28} rx={W + 15} ry={52} fill={sh(c, 0.7)} />;
      case "ciuffo":
        return <ellipse cx={120} cy={T + 26} rx={W + 6} ry={42} fill={sh(c, 0.75)} />;
      case "lunghi":
        return <path d="M60 130 C54 66 90 50 120 50 C150 50 186 66 180 130 L186 206 C168 202 164 176 166 146 L74 146 C76 176 72 202 54 206 Z" fill={g} />;
      case "ricci":
        return <ellipse cx={120} cy={92} rx={66} ry={48} fill={g} />;
      case "sfumati":
      case "corti":
        return <ellipse cx={120} cy={T + 28} rx={W + 3} ry={42} fill={sh(c, 0.7)} />;
      default:
        return null;
    }
  }
  switch (a) {
    case "mossi": {
      // ciuffo voluminoso e spettinato, attaccatura a V sulla fronte
      const r = rng(seed + 11);
      const bumps = Array.from({ length: 9 }).map((_, i) => {
        const ang = Math.PI * (1.08 + (0.84 * i) / 8);
        const rr = 1 + (r() - 0.3) * 0.1;
        return { x: 120 + Math.cos(ang) * (W + 6) * rr, y: T + 36 + Math.sin(ang) * 46 * rr, r: 9 + r() * 6 };
      });
      return (
        <g>
          <g fill={g}>
            {bumps.map((b, i) => (
              <circle key={i} cx={b.x} cy={b.y} r={b.r} />
            ))}
            <path
              d={`M${120 - W - 3} ${CY - 10} C${120 - W - 8} ${T + 8} ${120 - 30} ${T - 12} 120 ${T - 12} C${120 + 30} ${T - 12} ${120 + W + 8} ${T + 8} ${120 + W + 3} ${CY - 10} ` +
                `C${120 + W - 2} ${CY - 34} ${120 + W - 10} ${T + 34} ${120 + 30} ${T + 32} C${120 + 20} ${T + 44} ${120 + 6} ${T + 38} ${120 - 4} ${T + 46} ` +
                `C${120 - 14} ${T + 38} ${120 - 30} ${T + 38} ${120 - W + 8} ${T + 36} C${120 - W + 2} ${T + 52} ${120 - W} ${CY - 34} ${120 - W - 3} ${CY - 10} Z`}
            />
          </g>
          <Strand n={22} seed={seed} cx={120} cy={T + 40} rx={W + 6} ry={50} colore={c} />
        </g>
      );
    }
    case "ciuffo": {
      // ciuffo laterale pettinato verso destra, tempie più corte
      return (
        <g>
          <path
            d={`M${120 - W - 2} ${CY - 6} C${120 - W - 8} ${T + 6} ${120 - 24} ${T - 10} ${120 + 8} ${T - 9} C${120 + 44} ${T - 8} ${120 + W + 6} ${T + 12} ${120 + W + 2} ${CY - 8} ` +
              `C${120 + W - 2} ${CY - 32} ${120 + W - 8} ${T + 40} ${120 + 34} ${T + 34} C${120 + 12} ${T + 30} ${120 - 14} ${T + 36} ${120 - 36} ${T + 42} C${120 - W + 8} ${T + 46} ${120 - W + 2} ${CY - 30} ${120 - W - 2} ${CY - 6} Z`}
            fill={g}
          />
          {/* riga e onda del ciuffo */}
          <path d={`M${120 - 26} ${T - 4} C${120 - 4} ${T + 4} ${120 + 14} ${T + 18} ${120 + 20} ${T + 36}`} stroke={sh(c, 0.4)} strokeWidth={1.6} fill="none" opacity={0.55} strokeLinecap="round" />
          <path d={`M${120 - 18} ${T + 2} C${120 + 10} ${T + 8} ${120 + 30} ${T + 22} ${120 + 40} ${T + 34}`} stroke={sh(c, 1.7)} strokeWidth={2.2} fill="none" opacity={0.25} strokeLinecap="round" />
          <Strand n={24} seed={seed} cx={120} cy={T + 38} rx={W + 3} ry={46} colore={c} />
          {/* tempie rasate */}
          <path d={`M${120 - W} ${CY - 12} L${120 - W + 4} ${CY + 6} L${120 - W + 9} ${CY - 22} Z`} fill={sh(c, 0.8)} opacity={0.5} />
          <path d={`M${120 + W} ${CY - 12} L${120 + W - 4} ${CY + 6} L${120 + W - 9} ${CY - 22} Z`} fill={sh(c, 0.8)} opacity={0.5} />
        </g>
      );
    }
    case "corti":
    case "sfumati": {
      const alto = a === "sfumati" ? 6 : 0;
      return (
        <g>
          <path
            d={`M${120 - W - 2} ${CY - 8} C${120 - W - 6} ${T + 8} ${120 - 30} ${T - 6 - alto} 120 ${T - 6 - alto} C${120 + 30} ${T - 6 - alto} ${120 + W + 6} ${T + 8} ${120 + W + 2} ${CY - 8} ` +
              `C${120 + W - 1} ${CY - 30} ${120 + W - 6} ${T + 38} ${120 + 34} ${T + 33} C${120 + 12} ${T + 28 - alto} ${120 - 12} ${T + 28 - alto} ${120 - 34} ${T + 33} ` +
              `C${120 - W + 6} ${T + 38} ${120 - W + 1} ${CY - 30} ${120 - W - 2} ${CY - 8} Z`}
            fill={g}
          />
          {/* dissolvenza delle basette (sfumatura) */}
          <path
            d={`M${120 - W - 2} ${CY - 8} C${120 - W - 6} ${T + 8} ${120 - W + 2} ${T + 24} ${120 - W + 8} ${T + 34} L${120 - W + 1} ${CY - 30} Z`}
            fill={c}
            opacity={0.001}
          />
          <Strand n={a === "sfumati" ? 20 : 16} seed={seed} cx={120} cy={T + 34} rx={W + 2} ry={40} colore={c} />
          <path d={`M${120 - W + 1} ${CY - 26} L${120 - W + 6} ${CY + 4} L${120 - W + 12} ${CY - 22} Z`} fill={sh(c, 0.9)} opacity={0.6} />
          <path d={`M${120 + W - 1} ${CY - 26} L${120 + W - 6} ${CY + 4} L${120 + W - 12} ${CY - 22} Z`} fill={sh(c, 0.9)} opacity={0.6} />
        </g>
      );
    }
    case "rasati":
      return <path d={`M${120 - W} ${CY - 12} C${120 - W - 4} ${T + 10} ${120 - 26} ${T - 2} 120 ${T - 2} C${120 + 26} ${T - 2} ${120 + W + 4} ${T + 10} ${120 + W} ${CY - 12} C${120 + W - 4} ${CY - 34} ${120 + 30} ${T + 30} 120 ${T + 30} C${120 - 30} ${T + 30} ${120 - W + 4} ${CY - 34} ${120 - W} ${CY - 12} Z`} fill={c} opacity={0.6} />;
    case "stempiato": {
      // testa rasata con stempiatura e ombra di capelli cortissimi ai lati
      const col = sh(mix(c, pelle, 0.25), 0.9);
      return (
        <g>
          <path
            d={`M${120 - W} ${CY - 6} C${120 - W - 3} ${T + 10} ${120 - 30} ${T + 2} 120 ${T + 2} C${120 + 30} ${T + 2} ${120 + W + 3} ${T + 10} ${120 + W} ${CY - 6} ` +
              `C${120 + W - 2} ${CY - 22} ${120 + W - 8} ${T + 34} ${120 + 30} ${T + 38} C${120 + 28} ${T + 22} ${120 + 14} ${T + 14} 120 ${T + 12} C${120 - 14} ${T + 14} ${120 - 28} ${T + 22} ${120 - 30} ${T + 38} ` +
              `C${120 - W + 8} ${T + 34} ${120 - W + 2} ${CY - 22} ${120 - W} ${CY - 6} Z`}
            fill={col}
            opacity={ombraCranio}
          />
          <ellipse cx={104} cy={T + 12} rx={20} ry={7} fill="#fff" opacity={0.28} transform={`rotate(-14 104 ${T + 12})`} />
        </g>
      );
    }
    case "pelato":
      return (
        <g>
                    <ellipse cx={103} cy={T + 14} rx={22} ry={8} fill="#fff" opacity={0.34} transform={`rotate(-16 103 ${T + 14})`} />
          <ellipse cx={96} cy={T + 11} rx={9} ry={3.4} fill="#fff" opacity={0.3} transform={`rotate(-16 96 ${T + 11})`} />
        </g>
      );
    case "cresta":
      return (
        <g fill={g}>
          <path d="M66 122 C62 76 92 62 120 62 C150 62 178 76 174 122 C168 100 150 90 120 90 C92 90 72 100 66 122 Z" opacity={0.4} />
          <path d="M106 96 C100 64 108 34 120 18 C132 34 140 64 134 96 Z" />
        </g>
      );
    case "ricci":
      return (
        <g fill={g}>
          {Array.from({ length: 13 }).map((_, i) => {
            const ang = Math.PI * (1.02 + (0.96 * i) / 12);
            return <circle key={i} cx={120 + Math.cos(ang) * 58} cy={112 + Math.sin(ang) * 56} r={17} />;
          })}
        </g>
      );
    case "lunghi":
      return <path d="M66 124 C60 70 92 54 120 54 C150 54 182 70 174 124 C168 96 150 82 122 84 C112 96 92 100 78 100 C72 106 68 114 66 124 Z" fill={g} />;
  }
  return null;
};

/* ------------------------------------------------------------------ */
/* barba                                                               */
/* ------------------------------------------------------------------ */
const Barba: React.FC<{ st: StileAvatar; geo: Geo; id: string; seed: number }> = ({ st, geo, id, seed }) => {
  const tipo = st.barba ?? "nessuna";
  const col = st.coloreBarba ?? st.capelli;
  const dens = st.densitaBarba ?? (tipo === "folta" ? 0.9 : tipo === "pizzetto" ? 0.75 : 0.5);
  const { Wj, Wc, H, W, yBocca, yNaso } = geo;
  const dots = useMemo(() => {
    const r = rng(seed + 5);
    const out: { x: number; y: number; r: number; o: number }[] = [];
    for (let i = 0; i < 380; i++) out.push({ x: 120 - W - 4 + r() * (2 * W + 8), y: CY - 2 + r() * (H + 12), r: 0.5 + r() * 0.7, o: 0.25 + r() * 0.5 });
    return out;
  }, [seed, W, H]);
  if (tipo === "nessuna") return null;

  const guancia = tipo === "folta" ? CY + 4 : CY + 22; // quanto sale la barba sulle guance
  const bordoBassoY = geo.chin + (tipo === "folta" ? 7 : 2);
  const area =
    tipo === "baffi"
      ? ""
      : tipo === "pizzetto"
        ? `M${120 - 16} ${yBocca + 9} Q120 ${yBocca + 4} ${120 + 16} ${yBocca + 9} C${120 + 22} ${yBocca + 24} ${120 + Wc + 10} ${geo.chin - 6} 120 ${bordoBassoY} C${120 - Wc - 10} ${geo.chin - 6} ${120 - 22} ${yBocca + 24} ${120 - 16} ${yBocca + 9} Z`
        : `M${120 - W + 1} ${CY - 12} C${120 - W + 3} ${guancia} ${120 - 34} ${guancia + 6} ${120 - 26} ${yBocca - 6} ` +
          `C${120 - 16} ${yBocca - 12} ${120 + 16} ${yBocca - 12} ${120 + 26} ${yBocca - 6} ` +
          `C${120 + 34} ${guancia + 6} ${120 + W - 3} ${guancia} ${120 + W - 1} ${CY - 12} ` +
          `C${120 + W + 1} ${CY + H * 0.3} ${120 + Wj + 3} ${CY + H * 0.5} ${120 + Wj + 1} ${CY + H * 0.62} ` +
          `C${120 + Wj - 4} ${CY + H * 0.84} ${120 + Wc + 12} ${bordoBassoY} 120 ${bordoBassoY} ` +
          `C${120 - Wc - 12} ${bordoBassoY} ${120 - Wj + 4} ${CY + H * 0.84} ${120 - Wj - 1} ${CY + H * 0.62} ` +
          `C${120 - Wj - 3} ${CY + H * 0.5} ${120 - W - 1} ${CY + H * 0.3} ${120 - W + 1} ${CY - 12} Z`;
  const baffi = `M${120 - 22} ${yBocca - 2} C${120 - 20} ${yNaso + 9} ${120 - 6} ${yNaso + 6} 120 ${yNaso + 9} C${120 + 6} ${yNaso + 6} ${120 + 20} ${yNaso + 9} ${120 + 22} ${yBocca - 2} C${120 + 14} ${yBocca - 6} ${120 + 6} ${yBocca - 5} 120 ${yBocca - 3} C${120 - 6} ${yBocca - 5} ${120 - 14} ${yBocca - 6} ${120 - 22} ${yBocca - 2} Z`;
  const clip = `${id}-barba-clip`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          {area && <path d={area} />}
          {tipo !== "pizzetto" || true ? <path d={baffi} /> : null}
        </clipPath>
        <linearGradient id={`${id}-bgrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={col} stopOpacity={dens * 0.55} />
          <stop offset="0.55" stopColor={col} stopOpacity={dens * 0.85} />
          <stop offset="1" stopColor={sh(col, 0.8)} stopOpacity={Math.min(1, dens * 1.05)} />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${id}-bgrad)`} />}
      <path d={baffi} fill={col} opacity={Math.min(1, dens + 0.15)} />
      <g clipPath={`url(#${clip})`}>
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={sh(col, 0.6)} opacity={d.o * dens} />
        ))}
        {dens > 0.7 && <Strand n={26} seed={seed + 3} cx={120} cy={CY + 20} rx={W} ry={H * 0.8} colore={col} a0={0.1} a1={Math.PI - 0.1} />}
      </g>
      {/* ombra leggera sotto il labbro */}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* occhiali                                                            */
/* ------------------------------------------------------------------ */
const Occhiali: React.FC<{ st: StileAvatar; geo: Geo; id: string; su: boolean }> = ({ st, geo, id, su }) => {
  const m = st.montatura ?? { tipo: "rettangolari" as const, colore: "#1A1A1A" };
  const { sep, yOcchi } = geo;
  const sp = 3 * (m.spessore ?? 1);
  const dy = su ? -40 : 0;
  const rot = su ? -4 : 0;
  const xs = [120 - sep, 120 + sep];
  const lente = (x: number) => {
    if (m.tipo === "tondi") return <circle cx={x} cy={yOcchi} r={15} />;
    if (m.tipo === "sole") return <path d={`M${x - 19} ${yOcchi - 10} L${x + 19} ${yOcchi - 10} Q${x + 20} ${yOcchi + 14} ${x + 8} ${yOcchi + 15} Q${x - 14} ${yOcchi + 16} ${x - 19} ${yOcchi - 10} Z`} />;
    return <rect x={x - 19} y={yOcchi - 11} width={38} height={25} rx={6} />;
  };
  return (
    <g transform={`translate(0 ${dy}) rotate(${rot} 120 ${yOcchi})`}>
      <defs>
        <linearGradient id={`${id}-lente`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.tipo === "sole" ? "#2B2F36" : "#DDE9F2"} stopOpacity={m.tipo === "sole" ? 1 : 0.18} />
          <stop offset="1" stopColor={m.tipo === "sole" ? "#07090C" : "#9DB3C4"} stopOpacity={m.tipo === "sole" ? 1 : 0.28} />
        </linearGradient>
      </defs>
      {/* stanghette */}
      <path d={`M${120 - sep - 19} ${yOcchi - 4} L${120 - geo.W - 2} ${yOcchi - 2}`} stroke={m.colore} strokeWidth={sp * 0.8} strokeLinecap="round" />
      <path d={`M${120 + sep + 19} ${yOcchi - 4} L${120 + geo.W + 2} ${yOcchi - 2}`} stroke={m.colore} strokeWidth={sp * 0.8} strokeLinecap="round" />
      {/* ponte */}
      <path d={`M${120 - sep + 17} ${yOcchi - 3} Q120 ${yOcchi - 8} ${120 + sep - 17} ${yOcchi - 3}`} stroke={m.colore} strokeWidth={sp} fill="none" strokeLinecap="round" />
      {xs.map((x) => (
        <g key={x} fill={`url(#${id}-lente)`} stroke={m.colore} strokeWidth={sp} strokeLinejoin="round">
          {lente(x)}
        </g>
      ))}
      {/* riflessi */}
      {xs.map((x) => (
        <g key={"r" + x} opacity={m.tipo === "sole" ? 0.45 : 0.55}>
          <path d={`M${x - 12} ${yOcchi + 8} L${x - 3} ${yOcchi - 7}`} stroke="#fff" strokeWidth={m.tipo === "sole" ? 3 : 2.2} strokeLinecap="round" />
          <path d={`M${x - 6} ${yOcchi + 9} L${x + 1} ${yOcchi - 1}`} stroke="#fff" strokeWidth={1.2} strokeLinecap="round" />
        </g>
      ))}
      {m.tipo === "sole" && (
        <path d={`M${120 - sep - 20} ${yOcchi - 12} L${120 + sep + 20} ${yOcchi - 12}`} stroke={m.colore} strokeWidth={sp + 1.6} strokeLinecap="round" />
      )}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* vestiti                                                             */
/* ------------------------------------------------------------------ */
const Vestito: React.FC<{ st: StileAvatar; prim: string; sec: string; id: string; pelle: string }> = ({ st, prim, sec, id, pelle }) => {
  const v = st.vestito ?? { tipo: "tuta" as const };
  const k = st.corporatura ?? 1;
  const base = v.colore ?? prim;
  const x0 = 120 - 118 * k;
  const x1 = 120 + 118 * k;
  const corpo = `M${x0} 300 C${x0 + 6} 244 ${120 - 66 * k} 226 ${120 - 22} 222 L${120 + 22} 222 C${120 + 66 * k} 226 ${x1 - 6} 244 ${x1} 300 Z`;
  const grad = `url(#${id}-stoffa)`;
  const scollo = sh(pelle, 0.78);
  const dettagli = (() => {
    switch (v.tipo) {
      case "tuta":
        return (
          <g>
            <path d={`M${120 - 26} 220 L120 258 L${120 + 26} 220 L${120 + 30} 226 L120 266 L${120 - 30} 226 Z`} fill={sh(base, 0.7)} />
            <path d={`M${120 - 24} 221 L120 262 L${120 + 24} 221 L${120 + 14} 218 L120 244 L${120 - 14} 218 Z`} fill={scollo} />
            <path d={`M${120 - 36} 214 C${120 - 30} 226 ${120 - 22} 236 ${120 - 6} 256 L120 300 L${120 - 4} 300 L${120 - 18} 250 Z`} fill={base} />
            <path d={`M${120 - 28} 216 L${120 - 6} 262 L${120 - 18} 270 L${120 - 40} 228 Z`} fill={sh(base, 1.12)} stroke={sh(base, 0.6)} strokeWidth={1.2} />
            <path d={`M${120 + 28} 216 L${120 + 6} 262 L${120 + 18} 270 L${120 + 40} 228 Z`} fill={sh(base, 0.92)} stroke={sh(base, 0.6)} strokeWidth={1.2} />
            <line x1={120} y1={262} x2={120} y2={300} stroke="#D8D8D8" strokeWidth={2} />
            <circle cx={120} cy={266} r={2.4} fill="#E6E6E6" />
            <path d={`M${x0 + 8} 262 C${x0 + 12} 240 ${120 - 62 * k} 230 ${120 - 62 * k} 230`} stroke={sec} strokeWidth={6} fill="none" opacity={0.9} />
            <path d={`M${x1 - 8} 262 C${x1 - 12} 240 ${120 + 62 * k} 230 ${120 + 62 * k} 230`} stroke={sec} strokeWidth={6} fill="none" opacity={0.9} />
          </g>
        );
      case "tshirt":
      case "maglia":
        return (
          <g>
            <path d={`M${120 - 30} 221 Q120 ${v.tipo === "maglia" ? 262 : 252} ${120 + 30} 221 L${120 + 34} 224 Q120 ${v.tipo === "maglia" ? 272 : 260} ${120 - 34} 224 Z`} fill={v.tipo === "maglia" ? sec : sh(base, 0.72)} />
            <path d={`M${120 - 28} 222 Q120 ${v.tipo === "maglia" ? 256 : 246} ${120 + 28} 222 Q120 232 ${120 - 28} 222 Z`} fill={scollo} />
            {v.tipo === "maglia" && (
              <>
                <path d={`M${x0 + 4} 276 L${x0 + 26} 244`} stroke={sec} strokeWidth={5} opacity={0.9} />
                <path d={`M${x1 - 4} 276 L${x1 - 26} 244`} stroke={sec} strokeWidth={5} opacity={0.9} />
              </>
            )}
          </g>
        );
      case "henley":
        return (
          <g>
            <path d={`M${120 - 28} 221 Q120 238 ${120 + 28} 221 L${120 + 32} 225 Q120 246 ${120 - 32} 225 Z`} fill={sh(base, 0.7)} />
            <path d={`M${120 - 26} 222 Q120 236 ${120 + 26} 222 Q120 228 ${120 - 26} 222 Z`} fill={scollo} />
            <rect x={116} y={230} width={8} height={58} rx={2} fill={sh(base, 1.15)} opacity={0.5} />
            {[238, 252, 266].map((y) => (
              <circle key={y} cx={120} cy={y} r={2.6} fill={sh(base, 1.9)} stroke={sh(base, 0.5)} strokeWidth={0.8} />
            ))}
          </g>
        );
      case "canotta":
        return (
          <g>
            {/* spalle scoperte: pelle al posto delle maniche */}
            <path d={`M${x0 + 2} 300 C${x0 + 8} 252 ${120 - 62 * k} 232 ${120 - 52 * k} 228 L${120 - 40 * k} 300 Z`} fill={pelle} />
            <path d={`M${x1 - 2} 300 C${x1 - 8} 252 ${120 + 62 * k} 232 ${120 + 52 * k} 228 L${120 + 40 * k} 300 Z`} fill={pelle} />
            <path d={`M${x0 + 2} 300 C${x0 + 8} 252 ${120 - 62 * k} 232 ${120 - 52 * k} 228 L${120 - 40 * k} 300 Z`} fill="#000" opacity={0.1} />
            <path d={`M${120 - 52 * k} 228 C${120 - 40} 232 ${120 - 30} 246 120 262 C${120 + 30} 246 ${120 + 40} 232 ${120 + 52 * k} 228 L${120 + 40 * k} 300 L${120 - 40 * k} 300 Z`} fill="#F2F2F0" />
            <path d={`M${120 - 52 * k} 228 C${120 - 44} 236 ${120 - 30} 262 120 270 C${120 + 30} 262 ${120 + 44} 236 ${120 + 52 * k} 228`} fill="none" stroke="#D9D9D5" strokeWidth={2} />
            <path d={`M${120 - 26} 222 Q120 262 ${120 + 26} 222 Q120 236 ${120 - 26} 222 Z`} fill={scollo} opacity={0.0} />
          </g>
        );
      case "lino":
        return (
          <g>
            <path d={`M${120 - 38} 214 L${120 - 6} 252 L${120 - 22} 262 L${120 - 50} 228 Z`} fill={sh(base, 1.06)} stroke={sh(base, 0.7)} strokeWidth={1.1} />
            <path d={`M${120 + 38} 214 L${120 + 6} 252 L${120 + 22} 262 L${120 + 50} 228 Z`} fill={sh(base, 0.93)} stroke={sh(base, 0.7)} strokeWidth={1.1} />
            <path d={`M${120 - 22} 222 L120 258 L${120 + 22} 222 Q120 236 ${120 - 22} 222 Z`} fill={scollo} />
            <line x1={120} y1={258} x2={120} y2={300} stroke={sh(base, 0.7)} strokeWidth={1.6} />
            {[270, 288].map((y) => (
              <circle key={y} cx={120} cy={y} r={2.4} fill={sh(base, 1.2)} stroke={sh(base, 0.6)} strokeWidth={0.8} />
            ))}
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M${x0 + 20 + i * 40} ${262 + (i % 2) * 10} q10 12 -6 30`} stroke={sh(base, 0.8)} strokeWidth={1.2} fill="none" opacity={0.35} />
            ))}
          </g>
        );
      case "jeans":
        return (
          <g>
            {/* maglietta della squadra sotto il giubbotto */}
            <path d={`M${120 - 30} 221 Q120 262 ${120 + 30} 221 L${120 + 22} 300 L${120 - 22} 300 Z`} fill={prim} />
            <path d={`M${120 - 28} 222 Q120 250 ${120 + 28} 222 Q120 232 ${120 - 28} 222 Z`} fill={scollo} />
            <path d={`M${120 - 30} 221 Q120 252 ${120 + 30} 221`} fill="none" stroke={sh(prim, 0.7)} strokeWidth={3} />
            {/* giubbotto di jeans */}
            <path d={`M${120 - 36} 216 L${120 - 30} 232 L${120 - 22} 300 L${x0 + 14} 300 C${x0 + 14} 260 ${120 - 62 * k} 232 ${120 - 62 * k} 228 Z`} fill="#4D6B8E" />
            <path d={`M${120 + 36} 216 L${120 + 30} 232 L${120 + 22} 300 L${x1 - 14} 300 C${x1 - 14} 260 ${120 + 62 * k} 232 ${120 + 62 * k} 228 Z`} fill="#46627F" />
            <path d={`M${120 - 38} 214 L${120 - 26} 246 L${120 - 36} 252 L${120 - 52} 226 Z`} fill="#5C7BA0" stroke="#34506F" strokeWidth={1.2} />
            <path d={`M${120 + 38} 214 L${120 + 26} 246 L${120 + 36} 252 L${120 + 52} 226 Z`} fill="#52708F" stroke="#34506F" strokeWidth={1.2} />
            <path d={`M${120 - 23} 232 L${120 - 24} 300`} stroke="#8EA9C6" strokeWidth={1.4} strokeDasharray="3 3" fill="none" />
            <path d={`M${120 + 23} 232 L${120 + 24} 300`} stroke="#8EA9C6" strokeWidth={1.4} strokeDasharray="3 3" fill="none" />
            <path d={`M${120 - 80 * k} 262 l24 -2 l2 22 l-26 2 Z`} fill="none" stroke="#8EA9C6" strokeWidth={1.2} strokeDasharray="3 3" />
            <path d={`M${120 + 80 * k} 262 l-24 -2 l-2 22 l26 2 Z`} fill="none" stroke="#8EA9C6" strokeWidth={1.2} strokeDasharray="3 3" />
            {[240, 262, 284].map((y) => (
              <circle key={y} cx={y > 250 ? 120 - 23 : 120 - 23} cy={y} r={2.2} fill="#B7C7D8" opacity={0.0} />
            ))}
          </g>
        );
    }
  })();
  return (
    <g>
      <path d={corpo} fill={v.tipo === "canotta" ? pelle : base} />
      <path d={corpo} fill={grad} />
      {dettagli}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* componente                                                          */
/* ------------------------------------------------------------------ */
export const AvatarAllenatore: React.FC<{
  allenatore: TAllenatore;
  emozione: Emozione;
  /** larghezza in px */
  size: number;
  flip?: boolean;
  effetti?: boolean;
  /** sfasa le animazioni (blink ecc.) tra due allenatori nella stessa scena */
  fase?: number;
}> = ({ allenatore, emozione, size, flip = false, effetti = true, fase = 0 }) => {
  const t = useCurrentFrame() + fase;
  const st = allenatore.avatar;
  const prim = allenatore.colori.primario;
  const sec = allenatore.colori.secondario;
  const id = `av-${allenatore.id}`;
  const seed = seme(allenatore.id);
  const geo = useMemo(() => geometria(st), [st]);

  // movimento del corpo per emozione
  let dx = 0,
    dy = 0,
    rot = 0;
  const respiro = 1 + 0.01 * Math.sin(t / 9);
  if (emozione === "esultanza") {
    dy = -Math.abs(Math.sin(t / 5)) * 18;
    rot = Math.sin(t / 5) * 3;
  } else if (emozione === "rabbia") {
    dx = Math.sin(t * 2.1) * 3.5 + Math.sin(t * 3.7) * 2;
  } else if (emozione === "pianto") {
    dy = Math.sin(t / 2.2) * 3;
  } else if (emozione === "tristezza") {
    rot = Math.sin(t / 18) * 2;
    dy = 4;
  }
  const ciclo = ((t % 96) + 96) % 96;
  const blink = ciclo < 5 ? Math.abs(ciclo - 2.5) / 2.5 : 1;

  const wrapStyle: React.CSSProperties = {
    width: size,
    height: (size * 300) / 240,
    position: "relative",
    transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scaleX(${flip ? -1 : 1})`,
    transformOrigin: "50% 100%",
  };

  const png = allenatore.immagini?.[emozione];
  if (png) {
    return (
      <div style={wrapStyle}>
        <Img
          src={png.startsWith("http") ? png : staticFile(png)}
          style={{ width: "100%", height: "100%", objectFit: "contain", transform: `scaleY(${respiro})`, transformOrigin: "50% 100%" }}
        />
      </div>
    );
  }

  const [bOut, bIn] = SOPRACCIGLIA[emozione];
  const pelle = st.pelle;
  const vapore = (t % 40) / 40;
  const sole = st.occhiali && st.montatura?.tipo === "sole";
  const occhialiSu = !!sole && (emozione === "tristezza" || emozione === "pianto" || emozione === "rabbia");
  const iride = st.coloreOcchi ?? "#4B3322";
  const colBrow = st.coloreSopracciglia ?? (st.acconciatura === "pelato" || st.acconciatura === "stempiato" ? sh(st.coloreBarba ?? "#3a2a22", 0.9) : sh(st.capelli, 0.85));
  const spessBrow = st.sopracciglia?.spessore ?? 4.5;
  const arcoBrow = st.sopracciglia?.arco ?? 2.5;
  const guanceRosse = emozione === "esultanza" || emozione === "pianto" || emozione === "rabbia";
  const haBarba = !!st.barba && st.barba !== "nessuna";
  const ombra = sh(pelle, 0.7);
  const orecchie = st.orecchie ?? 1;
  const eyesHidden = !!sole && !occhialiSu;

  return (
    <div style={wrapStyle}>
      <svg viewBox="0 0 240 300" width="100%" height="100%" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id={`${id}-pelle`} cx="0.42" cy="0.36" r="0.8">
            <stop offset="0" stopColor={sh(pelle, 1.08)} />
            <stop offset="0.62" stopColor={pelle} />
            <stop offset="1" stopColor={sh(pelle, 0.8)} />
          </radialGradient>
          <linearGradient id={`${id}-hair`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor={sh(st.capelli, 1.28)} />
            <stop offset="0.45" stopColor={st.capelli} />
            <stop offset="1" stopColor={sh(st.capelli, 0.7)} />
          </linearGradient>
          <linearGradient id={`${id}-stoffa`} x1="0" y1="0" x2="1" y2="0.3">
            <stop offset="0" stopColor="#fff" stopOpacity={0.12} />
            <stop offset="0.5" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.28} />
          </linearGradient>
          <linearGradient id={`${id}-collo`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sh(pelle, 0.5)} />
            <stop offset="0.5" stopColor={sh(pelle, 0.82)} />
            <stop offset="1" stopColor={sh(pelle, 0.92)} />
          </linearGradient>
          <linearGradient id={`${id}-lato`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity={0} />
            <stop offset="0.6" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.16} />
          </linearGradient>
          <clipPath id={`${id}-faccia`}>
            <path d={geo.path} />
          </clipPath>
        </defs>

        {/* nuvoletta della tristezza */}
        {effetti && emozione === "tristezza" && (
          <g transform={`translate(${Math.sin(t / 14) * 6} 0)`}>
            {[0, 1, 2, 3, 4].map((i) => {
              const yy = ((t * 4 + i * 23) % 60) + 12;
              return <line key={i} x1={88 + i * 16} y1={yy} x2={86 + i * 16} y2={yy + 10} stroke="#7FB8FF" strokeWidth={3} strokeLinecap="round" opacity={1 - yy / 80} />;
            })}
            <g fill="#5B6378">
              <circle cx={96} cy={0} r={18} />
              <circle cx={122} cy={-8} r={24} />
              <circle cx={148} cy={2} r={17} />
              <rect x={80} y={0} width={84} height={16} rx={8} />
            </g>
          </g>
        )}

        {/* corpo e vestito */}
        <Vestito st={st} prim={prim} sec={sec} id={id} pelle={pelle} />

        {/* collo */}
        <path d={`M${120 - 25} ${CY + geo.H * 0.55} L${120 - 27} 232 Q120 244 ${120 + 27} 232 L${120 + 25} ${CY + geo.H * 0.55} Z`} fill={`url(#${id}-collo)`} />
        <path d={`M${120 + 4} ${CY + geo.H * 0.55} L${120 + 25} ${CY + geo.H * 0.55} L${120 + 27} 232 Q${120 + 18} 238 ${120 + 4} 236 Z`} fill="#000" opacity={0.12} />
        {st.collana && (
          <g fill="none" strokeLinecap="round">
            <path d={`M${120 - 25} 224 Q120 262 ${120 + 25} 224`} stroke="#C9CED6" strokeWidth={2.2} />
            <path d={`M${120 - 25} 224 Q120 262 ${120 + 25} 224`} stroke="#fff" strokeWidth={0.8} strokeDasharray="1.5 2.5" opacity={0.9} />
            <path d={`M${120 - 22} 226 Q120 276 ${120 + 22} 226`} stroke="#B9BFC8" strokeWidth={1.8} />
            <path d={`M120 270 l-3 6 l3 6 l3 -6 Z`} fill="#D8DCE3" stroke="#8E959F" strokeWidth={0.8} />
          </g>
        )}

        <Capelli st={st} geo={geo} fronte={false} id={id} seed={seed} pelle={pelle} />

        {/* orecchie */}
        {[-1, 1].map((s) => {
          const x = 120 + s * (geo.W + 1.5);
          const o = 7.5 * orecchie;
          return (
            <g key={s}>
              <path d={`M${x - s * 3} ${CY - 12} C${x + s * (o + 6)} ${CY - 20} ${x + s * (o + 8)} ${CY + 8} ${x + s * 3} ${CY + 18} Z`} fill={sh(pelle, 0.93)} />
              <path d={`M${x + s * 2} ${CY - 10} C${x + s * (o + 2)} ${CY - 14} ${x + s * (o + 3)} ${CY + 4} ${x + s * 3} ${CY + 11}`} stroke={ombra} strokeWidth={1.6} fill="none" opacity={0.7} strokeLinecap="round" />
            </g>
          );
        })}

        {/* testa */}
        <g transform={`translate(120 192) scale(1 ${respiro}) translate(-120 -192)`}>
          <path d={geo.path} fill={`url(#${id}-pelle)`} />
          <g clipPath={`url(#${id}-faccia)`}>
            <rect x={0} y={0} width={240} height={300} fill={`url(#${id}-lato)`} />
            {/* ombra sotto zigomi e mascella */}
            <ellipse cx={120 - geo.W * 0.62} cy={CY + 24} rx={13} ry={20} fill={ombra} opacity={0.12} />
            <ellipse cx={120 + geo.W * 0.62} cy={CY + 24} rx={13} ry={20} fill={ombra} opacity={0.2} />
            {/* guance */}
            <g fill="#E8646E" opacity={guanceRosse ? (emozione === "rabbia" ? 0.4 : 0.3) : 0.1}>
              <ellipse cx={120 - geo.W * 0.6} cy={CY + 26} rx={14} ry={9} />
              <ellipse cx={120 + geo.W * 0.6} cy={CY + 26} rx={14} ry={9} />
            </g>
            {emozione === "rabbia" && <rect x={0} y={0} width={240} height={300} fill="#FF1E1E" opacity={0.2 + 0.07 * Math.sin(t / 3)} />}
            {/* ombra sotto il labbro e sul mento */}
            <ellipse cx={120} cy={geo.yBocca + 17} rx={11} ry={4} fill={ombra} opacity={0.25} />
            <ellipse cx={120} cy={geo.chin - 4} rx={geo.Wc + 8} ry={7} fill="#000" opacity={0.05} />
            {/* ombra dei capelli sulla fronte */}
          </g>

          {/* pieghe naso-labiali */}
          {(emozione === "esultanza" || emozione === "grinta" || emozione === "rabbia" || emozione === "neutro") && (
            <g stroke={ombra} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={emozione === "esultanza" ? 0.5 : 0.28}>
              <path d={`M${120 - 11} ${geo.yNaso + 4} Q${120 - 20} ${geo.yBocca - 6} ${120 - 18} ${geo.yBocca + 4}`} />
              <path d={`M${120 + 11} ${geo.yNaso + 4} Q${120 + 20} ${geo.yBocca - 6} ${120 + 18} ${geo.yBocca + 4}`} />
            </g>
          )}

          <Naso geo={geo} pelle={pelle} larg={st.naso ?? 1} />

          {/* occhi */}
          {!eyesHidden && (
            <>
              <Occhio x={120 - geo.sep} y={geo.yOcchi} lato={-1} emo={emozione} blink={blink} pelle={pelle} iride={iride} id={id} sguardo={emozione === "tristezza" ? 0.6 : 0} />
              <Occhio x={120 + geo.sep} y={geo.yOcchi} lato={1} emo={emozione} blink={blink} pelle={pelle} iride={iride} id={id} sguardo={emozione === "tristezza" ? 0.6 : 0} />
            </>
          )}
          {eyesHidden && (
            <g>
              {[-1, 1].map((s) => (
                <ellipse key={s} cx={120 + s * geo.sep} cy={geo.yOcchi + 2} rx={13} ry={10} fill={ombra} opacity={0.2} />
              ))}
            </g>
          )}

          <Barba st={st} geo={geo} id={id} seed={seed} />
          <Bocca emo={emozione} t={t} geo={geo} pelle={pelle} larg={st.bocca ?? 1} barba={haBarba} />

          <Capelli st={st} geo={geo} fronte id={id} seed={seed} pelle={pelle} />

          {/* sopracciglia */}
          {[-1, 1].map((s) => (
            <Sopracciglio key={s} lato={s as -1 | 1} geo={geo} out={bOut} inn={bIn} spess={spessBrow} arco={arcoBrow} colore={colBrow} />
          ))}

          {st.occhiali && <Occhiali st={st} geo={geo} id={id} su={occhialiSu} />}

          {/* lacrime */}
          {emozione === "pianto" && (
            <g>
              <path d={`M${120 - geo.sep + 2} ${geo.yOcchi + 4} C${120 - geo.sep - 2} ${geo.yOcchi + 22} ${120 - geo.sep} ${geo.yOcchi + 40} ${120 - geo.sep - 5} ${geo.yOcchi + 58}`} stroke="#8FD3FF" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.8} />
              <path d={`M${120 + geo.sep - 2} ${geo.yOcchi + 4} C${120 + geo.sep + 2} ${geo.yOcchi + 22} ${120 + geo.sep} ${geo.yOcchi + 40} ${120 + geo.sep + 5} ${geo.yOcchi + 58}`} stroke="#8FD3FF" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.8} />
              <path d={`M${120 - geo.sep + 2} ${geo.yOcchi + 4} C${120 - geo.sep - 2} ${geo.yOcchi + 22} ${120 - geo.sep} ${geo.yOcchi + 40} ${120 - geo.sep - 5} ${geo.yOcchi + 58}`} stroke="#fff" strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.6} />
              {effetti &&
                [0, 1].map((i) => {
                  const p = ((t + i * 11) % 22) / 22;
                  return (
                    <g key={i} opacity={1 - p}>
                      <circle cx={120 - geo.sep - 6 - p * 10} cy={geo.yOcchi + 60 + p * 70} r={5} fill="#8FD3FF" />
                      <circle cx={120 + geo.sep + 6 + p * 10} cy={geo.yOcchi + 60 + p * 70} r={5} fill="#8FD3FF" />
                    </g>
                  );
                })}
            </g>
          )}

          {/* vene della rabbia */}
          {emozione === "rabbia" && (
            <g stroke="#C4141F" strokeWidth={3.2} fill="none" strokeLinecap="round" transform={`translate(${120 + geo.W * 0.72} ${geo.top + 30}) scale(${1 + 0.15 * Math.sin(t / 2)})`}>
              <path d="M-10 -3 Q-4 -4 -3 -10" />
              <path d="M10 -3 Q4 -4 3 -10" />
              <path d="M-10 3 Q-4 4 -3 10" />
              <path d="M10 3 Q4 4 3 10" />
            </g>
          )}
        </g>

        {/* vapore dalle orecchie */}
        {effetti && emozione === "rabbia" &&
          [-1, 1].map((s) =>
            [0, 0.5].map((off) => {
              const p = (vapore + off) % 1;
              return <circle key={`${s}${off}`} cx={120 + s * (geo.W + 14 + p * 30)} cy={128 - p * 70} r={6 + p * 14} fill="#EDEDED" opacity={0.75 * (1 - p)} />;
            }),
          )}

        {/* scintille della gioia */}
        {effetti && emozione === "esultanza" &&
          [0, 1, 2, 3].map((i) => {
            const p = ((t + i * 9) % 36) / 36;
            const ang = (i / 4) * Math.PI * 2 + 0.6;
            const r = 80 + p * 40;
            const s = Math.sin(p * Math.PI) * 9;
            const x = 120 + Math.cos(ang) * r;
            const y = 110 + Math.sin(ang) * r * 0.8;
            return <path key={i} d={`M${x} ${y - s} L${x + s * 0.3} ${y} L${x} ${y + s} L${x - s * 0.3} ${y} Z M${x - s} ${y} L${x} ${y + s * 0.3} L${x + s} ${y} L${x} ${y - s * 0.3} Z`} fill="#FFE066" />;
          })}
      </svg>

      {/* stemma sul petto (immagine HTML: così Remotion aspetta il caricamento) */}
      {allenatore.logo && (
        <Img
          src={allenatore.logo.startsWith("http") ? allenatore.logo : staticFile(allenatore.logo)}
          style={{
            position: "absolute",
            left: "66%",
            top: "83%",
            width: "14%",
            height: "11%",
            objectFit: "contain",
            transform: `scaleX(${flip ? -1 : 1})`,
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,.45))",
          }}
        />
      )}
    </div>
  );
};
