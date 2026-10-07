import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import type { Allenatore as TAllenatore, Emozione } from "../data/types";

// Avatar dell'allenatore disegnato in SVG, con 6 emozioni animate.
// È un segnaposto "vivo": quando avrete i PNG personalizzati basta indicarli in
// allenatore.immagini e verranno usati al posto del disegno, con le stesse animazioni.

const scuro = (hex: string, k = 0.75) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const f = (v: number) => Math.round(v * k);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

const SOPRACCIGLIA: Record<Emozione, [number, number]> = {
  // [offset estremo esterno, offset estremo interno] in px (negativo = su)
  neutro: [0, 0],
  esultanza: [-9, -7],
  tristezza: [4, -9],
  pianto: [5, -11],
  rabbia: [-6, 9],
  grinta: [-3, 6],
};

const INK = "#1A1214";

const Occhio: React.FC<{ x: number; y: number; emo: Emozione; blink: number; lato: -1 | 1 }> = ({
  x,
  y,
  emo,
  blink,
  lato,
}) => {
  if (emo === "esultanza")
    return <path d={`M${x - 10} ${y + 3} Q${x} ${y - 9} ${x + 10} ${y + 3}`} stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
  if (emo === "pianto")
    return <path d={`M${x - 10} ${y - 1} Q${x} ${y + 8} ${x + 10} ${y - 1}`} stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
  const ry = (emo === "grinta" ? 5.5 : emo === "rabbia" ? 8 : 10) * blink;
  const pupY = emo === "tristezza" ? y + 3 : y + 1;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={10} ry={Math.max(ry, 0.8)} fill="#fff" />
      {blink > 0.4 && <circle cx={x + lato * -1} cy={pupY} r={emo === "rabbia" ? 3.6 : 5} fill={INK} />}
      {blink > 0.4 && <circle cx={x + 1.5} cy={pupY - 2} r={1.4} fill="#fff" />}
    </g>
  );
};

const Bocca: React.FC<{ emo: Emozione; t: number }> = ({ emo, t }) => {
  switch (emo) {
    case "esultanza":
      return (
        <g>
          <path d="M98 160 Q120 200 142 160 Z" fill="#5A1418" />
          <path d="M101 161 L139 161 L136 167 L104 167 Z" fill="#fff" />
          <ellipse cx={120} cy={183} rx={10} ry={5} fill="#E2606C" />
        </g>
      );
    case "tristezza":
      return <path d="M105 177 Q120 163 135 177" stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
    case "pianto": {
      const o = 3 * Math.sin(t / 2.2);
      return (
        <g>
          <path d={`M102 ${183 + o * 0.3} Q120 ${152 + o} 138 ${183 + o * 0.3} Q120 ${192 + o} 102 ${183 + o * 0.3} Z`} fill="#4A1014" />
          <ellipse cx={120} cy={184 + o * 0.5} rx={8} ry={3.5} fill="#D9606B" />
        </g>
      );
    }
    case "rabbia":
      return (
        <g>
          <rect x={100} y={160} width={40} height={16} rx={4} fill="#fff" stroke={INK} strokeWidth={3} />
          <line x1={100} y1={168} x2={140} y2={168} stroke={INK} strokeWidth={2} />
          {[110, 120, 130].map((x) => (
            <line key={x} x1={x} y1={160} x2={x} y2={176} stroke={INK} strokeWidth={2} />
          ))}
        </g>
      );
    case "grinta":
      return <path d="M104 170 Q124 178 138 161" stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
    default:
      return <path d="M106 168 Q120 175 134 168" stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
  }
};

const Capelli: React.FC<{ stile: TAllenatore["avatar"]; fronte: boolean }> = ({ stile, fronte }) => {
  const c = stile.capelli;
  const a = stile.acconciatura;
  if (!fronte) {
    if (a === "lunghi")
      return <path d="M60 130 C54 66 90 50 120 50 C150 50 186 66 180 130 L186 206 C168 202 164 176 166 146 L74 146 C76 176 72 202 54 206 Z" fill={c} />;
    if (a === "ricci")
      return <ellipse cx={120} cy={92} rx={66} ry={48} fill={c} />;
    return null;
  }
  switch (a) {
    case "corti":
    case "lunghi":
      return <path d="M66 124 C60 70 92 54 120 54 C150 54 182 70 174 124 C168 96 150 82 122 84 C112 96 92 100 78 100 C72 106 68 114 66 124 Z" fill={c} />;
    case "rasati":
      return <path d="M66 122 C62 72 92 58 120 58 C150 58 178 72 174 122 C168 98 150 86 120 86 C92 86 72 98 66 122 Z" fill={c} opacity={0.55} />;
    case "ricci":
      return (
        <g fill={c}>
          {Array.from({ length: 13 }).map((_, i) => {
            const ang = Math.PI * (1.02 + (0.96 * i) / 12);
            return <circle key={i} cx={120 + Math.cos(ang) * 58} cy={112 + Math.sin(ang) * 56} r={17} />;
          })}
        </g>
      );
    case "cresta":
      return (
        <g fill={c}>
          <path d="M66 122 C62 76 92 62 120 62 C150 62 178 76 174 122 C168 100 150 90 120 90 C92 90 72 100 66 122 Z" opacity={0.4} />
          <path d="M106 96 C100 64 108 34 120 18 C132 34 140 64 134 96 Z" />
        </g>
      );
    case "pelato":
      return <ellipse cx={98} cy={84} rx={16} ry={7} fill="#fff" opacity={0.35} transform="rotate(-20 98 84)" />;
  }
  return null;
};

const Barba: React.FC<{ stile: TAllenatore["avatar"] }> = ({ stile }) => {
  const c = stile.capelli;
  switch (stile.barba) {
    case "corta":
      return <path d="M70 148 C74 192 100 202 120 202 C140 202 166 192 170 148 C160 178 140 184 120 184 C100 184 80 178 70 148 Z" fill={c} opacity={0.8} />;
    case "folta":
      return <path d="M66 138 C64 208 100 222 120 222 C140 222 176 208 174 138 C166 172 146 160 120 158 C94 160 74 172 66 138 Z" fill={c} />;
    case "baffi":
      return <path d="M96 158 C104 148 116 150 120 155 C124 150 136 148 144 158 C134 160 126 162 120 159 C114 162 106 160 96 158 Z" fill={c} />;
    default:
      return null;
  }
};

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

  // movimento del corpo per emozione
  let dx = 0,
    dy = 0,
    rot = 0;
  const respiro = 1 + 0.012 * Math.sin(t / 9);
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

  return (
    <div style={wrapStyle}>
      <svg viewBox="0 0 240 300" width="100%" height="100%" style={{ overflow: "visible" }}>
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

        {/* corpo */}
        <path d="M14 300 C20 236 60 220 120 218 C180 220 220 236 226 300 Z" fill="#1E2234" />
        <path d="M14 300 C20 236 60 220 120 218 C180 220 220 236 226 300 Z" fill={prim} opacity={0.18} />
        <path d="M96 220 L120 266 L144 220 Z" fill="#F3F3F3" />
        <path d="M113 228 L127 228 L131 274 L120 288 L109 274 Z" fill={prim} stroke={scuro(prim, 0.7)} strokeWidth={1.5} />
        <path d="M60 236 L96 220 L112 262" fill="none" stroke="#0E1120" strokeWidth={3} />
        <path d="M180 236 L144 220 L128 262" fill="none" stroke="#0E1120" strokeWidth={3} />
        <circle cx={172} cy={258} r={10} fill={prim} stroke={sec} strokeWidth={3} />

        {/* collo e orecchie */}
        <rect x={102} y={176} width={36} height={48} rx={10} fill={scuro(pelle, 0.88)} />
        <ellipse cx={66} cy={134} rx={11} ry={15} fill={scuro(pelle, 0.92)} />
        <ellipse cx={174} cy={134} rx={11} ry={15} fill={scuro(pelle, 0.92)} />

        <Capelli stile={st} fronte={false} />

        {/* testa */}
        <g transform={`translate(120 192) scale(1 ${respiro}) translate(-120 -192)`}>
          <ellipse cx={120} cy={128} rx={54} ry={64} fill={pelle} />
          {emozione === "rabbia" && (
            <ellipse cx={120} cy={128} rx={54} ry={64} fill="#FF1E1E" opacity={0.22 + 0.08 * Math.sin(t / 3)} />
          )}

          {/* guance */}
          {(emozione === "esultanza" || emozione === "pianto" || emozione === "rabbia") && (
            <g fill="#FF6B7A" opacity={emozione === "rabbia" ? 0.5 : 0.35}>
              <ellipse cx={86} cy={152} rx={11} ry={6} />
              <ellipse cx={154} cy={152} rx={11} ry={6} />
            </g>
          )}

          <Barba stile={st} />
          <Capelli stile={st} fronte />

          {/* sopracciglia */}
          <g stroke={scuro(st.capelli, 0.9)} strokeWidth={6} strokeLinecap="round">
            <line x1={84} y1={106 + bOut} x2={110} y2={106 + bIn} />
            <line x1={156} y1={106 + bOut} x2={130} y2={106 + bIn} />
          </g>

          <Occhio x={98} y={127} emo={emozione} blink={blink} lato={-1} />
          <Occhio x={142} y={127} emo={emozione} blink={blink} lato={1} />

          {st.occhiali && (
            <g stroke="#111" strokeWidth={3.5} fill="rgba(255,255,255,0.10)">
              <rect x={82} y={115} width={34} height={25} rx={9} />
              <rect x={124} y={115} width={34} height={25} rx={9} />
              <line x1={116} y1={125} x2={124} y2={125} />
            </g>
          )}

          <path d="M120 132 C115 146 113 151 121 154" stroke={scuro(pelle, 0.7)} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Bocca emo={emozione} t={t} />

          {/* lacrime */}
          {emozione === "pianto" && (
            <g>
              <path d="M96 134 C92 150 94 168 90 186" stroke="#8FD3FF" strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.85} />
              <path d="M144 134 C148 150 146 168 150 186" stroke="#8FD3FF" strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.85} />
              {effetti &&
                [0, 1].map((i) => {
                  const p = ((t + i * 11) % 22) / 22;
                  return (
                    <g key={i} opacity={1 - p}>
                      <circle cx={88 - p * 10} cy={190 + p * 70} r={5} fill="#8FD3FF" />
                      <circle cx={152 + p * 10} cy={190 + p * 70} r={5} fill="#8FD3FF" />
                    </g>
                  );
                })}
            </g>
          )}

          {/* vene della rabbia */}
          {emozione === "rabbia" && (
            <g stroke="#C4141F" strokeWidth={3.5} fill="none" strokeLinecap="round" transform={`translate(150 82) scale(${1 + 0.15 * Math.sin(t / 2)})`}>
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
              return (
                <circle
                  key={`${s}${off}`}
                  cx={120 + s * (66 + p * 30)}
                  cy={128 - p * 70}
                  r={6 + p * 14}
                  fill="#EDEDED"
                  opacity={0.75 * (1 - p)}
                />
              );
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
    </div>
  );
};
