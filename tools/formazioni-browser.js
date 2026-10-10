// Da eseguire (javascript_tool) nella pagina https://leghe.fantacalcio.it/ciempions-fig/view/competition/645622/dashboard
// con l'utente già loggato. Usa gli header che il sito stesso manda alle sue API (non li stampa né li salva).
// Imposta prima: window.__giornata = N (giornata della lega). Restituisce il JSON di dati/formazioni-N.json.
const hdr = {};
const o = XMLHttpRequest.prototype.setRequestHeader;
XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
  if (k === "app_key" || k === "Authorization") hdr[k] = v;
  return o.apply(this, arguments);
};
history.pushState({}, "", "/ciempions-fig/view/competition/645622/fixtures");
dispatchEvent(new PopStateEvent("popstate"));
for (let i = 0; i < 60 && !(hdr.app_key && hdr.Authorization); i++) await new Promise((r) => setTimeout(r, 100));
XMLHttpRequest.prototype.setRequestHeader = o;
if (!(hdr.app_key && hdr.Authorization)) throw new Error("sessione non trovata");
const get = async (p) => {
  const r = await fetch("https://apileague.fantacalcio.it" + p, { headers: { app_key: hdr.app_key, Authorization: hdr.Authorization, Accept: "application/json" } });
  if (!r.ok) throw new Error(r.status + " " + p);
  return r.json();
};
const MAP = { 6414048: "milano-boys", 6414062: "aston-birra", 6414063: "pan-fc", 6414064: "manchester-squiddi", 6414066: "atletico-madrink", 7344149: "si-gonfia-la-rete", 11170711: "do-flamengo", 20055292: "aquafan" };
const N = window.__giornata;
const cal = await get("/onboarding/v1/league/competition/calendar/645622");
const g = cal.find((x) => x.matchDay === N);
if (!g) throw new Error("giornata " + N + " non trovata");
const byId = new Map((await get("/onboarding/v1/league/players")).players.map((p) => [p.id, p.name]));
const L = await get(`/gaming/v1/teamLineup/645622/${g.matchDay}/${g.championshipMatchDay}`);
const squadre = {};
for (const t of L) {
  if (!MAP[t.tid] || !(t.starts || []).length) continue;
  squadre[MAP[t.tid]] = {
    capitano: byId.get((t.capt || [])[0]) || null,
    vice: byId.get((t.capt || [])[1]) || null,
    modulo: t.mdl || null,
    titolari: t.starts.map((s) => byId.get(s.pid ?? s)).filter(Boolean),
  };
}
JSON.stringify({ giornata: N, giornataSerieA: g.championshipMatchDay, aggiornato: new Date().toISOString(), fonte: "leghe.fantacalcio.it", squadre }, null, 2);
