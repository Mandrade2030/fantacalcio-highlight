import { loadFont } from "@remotion/google-fonts/Inter";

// Inter in 900 corsivo maiuscolo = look da grafica TV sportiva
const { fontFamily } = loadFont("normal", {
  weights: ["500", "700", "800", "900"],
  subsets: ["latin", "latin-ext"],
});

export const FONT = `${fontFamily}, "Inter", "Inter Display", sans-serif`;

export const C = {
  bg: "#06070D",
  bg2: "#0D1020",
  ink: "#F5F6FB",
  mute: "#9097B0",
  lime: "#C6FF2E",
  gold: "#FFC83D",
  red: "#FF3346",
  yellow: "#FFD60A",
  ice: "#7FE3FF",
};

export const COLORE_RUOLO: Record<string, string> = {
  P: "#F5A623",
  D: "#27C26C",
  C: "#2F8DE4",
  A: "#E8413C",
};

export const W = 1080;
export const H = 1920;
export const FPS = 30;

/** Rende un colore leggibile su fondo scuro (team con colori troppo scuri, es. blu notte) */
export const accendi = (hex: string, minLuma = 0.35) => {
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luma >= minLuma) return hex;
  const k = minLuma / Math.max(luma, 0.05);
  const mix = Math.min(0.6, (k - 1) * 0.18);
  r = Math.round(r + (255 - r) * mix);
  g = Math.round(g + (255 - g) * mix);
  b = Math.round(b + (255 - b) * mix);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

export const conAlpha = (hex: string, a: number) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Colore del testo leggibile sopra un fondo colorato */
export const testoSu = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const luma = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return luma > 0.62 ? "#0A0C16" : "#FFFFFF";
};
