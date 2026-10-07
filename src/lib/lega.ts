import datiLega from "../data/lega.json";
import type { Allenatore, Giocatore, Giornata, GiornataInput, Lega, Squadra } from "../data/types";

export const LEGA = datiLega as Lega;

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const trovaSquadra = (idONome: string, lega: Lega = LEGA): Squadra => {
  const k = norm(idONome);
  const s = lega.squadre.find((x) => norm(x.id) === k || norm(x.nome) === k || norm(x.sigla) === k);
  if (!s) throw new Error(`Squadra "${idONome}" non trovata in lega.json. Valide: ${lega.squadre.map((x) => x.id).join(", ")}`);
  return s;
};

const daRosa = (squadra: Squadra, g: Giocatore | Omit<Giocatore, "ruolo">): Giocatore => {
  const trovato = squadra.rosa.find((r) => norm(r.nome) === norm(g.nome));
  const ruolo = ("ruolo" in g && g.ruolo) || trovato?.ruolo;
  if (!ruolo)
    throw new Error(
      `"${g.nome}" non è nella rosa di ${squadra.nome}. Controlla il nome (deve essere come su fantacalcio.it) o aggiungi "ruolo".`,
    );
  return { ...g, nome: trovato?.nome ?? g.nome, ruolo, immagine: g.immagine ?? trovato?.immagine } as Giocatore;
};

const comeAllenatore = (s: Squadra): Allenatore => ({
  id: s.id,
  nome: s.presidente,
  squadra: s.nome,
  sigla: s.sigla,
  logo: s.logo,
  colori: s.colori,
  avatar: s.avatar,
  immagini: s.immagini,
  tormentoni: s.tormentoni,
});

/**
 * Unisce il file della giornata con il database della lega.
 * Accetta anche una Giornata già completa (idempotente).
 */
export const preparaGiornata = (input: GiornataInput | Giornata, lega: Lega = LEGA): Giornata => {
  if ("allenatori" in input && input.allenatori?.length) return input as Giornata;
  const scontri = input.scontri.map((s) => {
    const casa = trovaSquadra(s.casa, lega);
    const trasf = trovaSquadra(s.trasferta, lega);
    return {
      ...s,
      casa: casa.id,
      trasferta: trasf.id,
      formazioneCasa: s.formazioneCasa.map((g) => daRosa(casa, g)),
      formazioneTrasferta: s.formazioneTrasferta.map((g) => daRosa(trasf, g)),
    };
  });
  return {
    lega: lega.lega,
    stagione: input.stagione ?? "2026/27",
    giornata: input.giornata,
    soglie: input.soglie,
    allenatori: lega.squadre.map(comeAllenatore),
    scontri,
    classificaPrima:
      input.classificaPrima ?? lega.squadre.map((x) => ({ allenatore: x.id, punti: 0 })),
  };
};
