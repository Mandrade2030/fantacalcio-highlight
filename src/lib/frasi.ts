// Testi della telecronaca per ogni scontro: usato dall'app (server Node) per generare la voce
// esattamente con le stesse frasi che compaiono nel video.
import type { Giornata, GiornataInput } from "../data/types";
import { analizzaScontro } from "./fanta";
import { preparaGiornata } from "./lega";
import { fraseMvp, fraseVerdetto, frasePrePartita } from "./telecronaca";

export const frasiGiornata = (input: Giornata | GiornataInput) => {
  const g = preparaGiornata(input);
  return g.scontri.map((_, i) => {
    const a = analizzaScontro(g, i);
    const seme = `${g.stagione}-${g.giornata}-${i}`;
    return { pre: frasePrePartita(a, seme), mvp: fraseMvp(a, seme), verdetto: fraseVerdetto(a, seme) };
  });
};
