// Collegamento diretto a leghe.fantacalcio.it (le stesse API che usa il sito), così il server
// scarica da solo formazioni e risultati senza il PC di Davide.
// La "chiave di lega" (app_key + token del sito, valida ~1 anno) la incolla Davide nell'app:
// sta in dati/impostazioni.json → fantacalcio { appKey, token } (file in .gitignore, mai su GitHub).

const API = "https://apileague.fantacalcio.it";
const COMPETIZIONE = 645622;
const RUOLI = { 1: "P", 2: "D", 3: "C", 4: "A" };
const URL_CAMPIONCINO = (img) => `https://content.fantacalcio.it/web/campioncini/21/large/${img}.png`;

/** scadenza del token (campo exp del JWT), senza verificarne la firma */
export const scadenzaToken = (token) => {
  try {
    const p = JSON.parse(Buffer.from(String(token).replace(/^Bearer\s+/i, "").split(".")[1], "base64url").toString("utf8"));
    return p.exp ? new Date(p.exp * 1000).toISOString() : null;
  } catch {
    return null;
  }
};

/** Il "codice" che incolla Davide: base64 di {a: app_key, t: Authorization}, oppure lo stesso JSON in chiaro */
export const leggiCodice = (codice) => {
  let x;
  const c = String(codice || "").trim();
  try {
    x = JSON.parse(c.startsWith("{") ? c : Buffer.from(c, "base64").toString("utf8"));
  } catch {
    throw new Error("Codice non valido: copialo di nuovo dalla pagina di fantacalcio.");
  }
  const appKey = x.a || x.app_key;
  const token = x.t || x.Authorization || x.token;
  if (!appKey || !token) throw new Error("Codice incompleto: rifai la procedura sulla pagina della lega.");
  return { appKey, token: /^Bearer /i.test(token) ? token : `Bearer ${token}` };
};

export const creaClient = ({ appKey, token }, mappa) => {
  const get = async (path) => {
    const r = await fetch(API + path, {
      headers: { app_key: appKey, Authorization: token, Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      // il dettaglio serve a capire se è la chiave (401) o il sito che non accetta richieste dal server (403 / pagina HTML)
      const corpo = (await r.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
      const html = /<html|<!doctype/i.test(corpo);
      if (r.status === 401) throw new Error(`Fantacalcio ha rifiutato la chiave (401${corpo && !html ? ": " + corpo : ""}).`);
      if (r.status === 403) throw new Error(`Fantacalcio non accetta richieste dal server (403${html ? ", pagina di blocco" : corpo ? ": " + corpo : ""}).`);
      throw new Error(`Fantacalcio: errore ${r.status} su ${path.split("?")[0]}${corpo && !html ? " (" + corpo + ")" : ""}`);
    }
    return r.json();
  };

  let giocatori = { t: 0, byId: null };
  const listaGiocatori = async () => {
    if (giocatori.byId && Date.now() - giocatori.t < 6 * 3600e3) return giocatori.byId;
    const j = await get("/onboarding/v1/league/players");
    giocatori = { t: Date.now(), byId: new Map((j.players || []).map((p) => [p.id, p])) };
    return giocatori.byId;
  };

  const calendario = () => get(`/onboarding/v1/league/competition/calendar/${COMPETIZIONE}`);
  const formazioniGiornata = (g) => get(`/gaming/v1/teamLineup/${COMPETIZIONE}/${g.matchDay}/${g.championshipMatchDay}`);

  /** tutte le giornate calcolate, nel formato di dati/giornata-N.json */
  const giornateCalcolate = async (soloDa = 1) => {
    const [cal, byId] = await Promise.all([calendario(), listaGiocatori()]);
    const punti = Object.fromEntries(Object.keys(mappa).map((k) => [k, 0]));
    const out = [];
    for (const g of cal) {
      if (!g.calculated) break;
      const classificaPrima = Object.entries(punti).map(([k, v]) => ({ allenatore: mappa[k], punti: v }));
      if (g.matchDay >= soloDa) {
        const L = await formazioniGiornata(g);
        const perSquadra = new Map(L.map((t) => [t.tid, t]));
        const formazione = (tid) => {
          const t = perSquadra.get(tid);
          if (!t) return [];
          const giocato = [...(t.starts || []).filter((x) => x.scr < 56 && !/u/i.test(x.ptype || "")), ...(t.bench || []).filter((x) => /e/i.test(x.ptype || "") && x.scr < 56)];
          return giocato.map((x) => {
            const p = byId.get(x.pid) || {};
            const b = String(x.b).split(";").map(Number);
            const o = { nome: p.name || String(x.pid), ruolo: RUOLI[p.fcrle] || "C", voto: x.scr, fantavoto: x.cscr, club: p.tname };
            const gol = (b[2] || 0) + (b[6] || 0);
            if (gol) o.gol = gol;
            if (b[6]) o.rigoreSegnato = b[6];
            if (b[3]) o.golSubiti = b[3];
            if (b[4]) o.rigoreParato = b[4];
            if (b[5]) o.rigoreSbagliato = b[5];
            if (b[7]) o.autogol = b[7];
            const a = (b[12] || 0) + (b[13] || 0) + (b[14] || 0);
            if (a) o.assist = a;
            if (b[0]) o.ammonizione = true;
            if (b[1]) o.espulsione = true;
            if (b[15]) o.mvpLega = true;
            o.immagine = URL_CAMPIONCINO(p.img || x.pid);
            return o;
          });
        };
        out.push({
          giornata: g.matchDay,
          giornataSerieA: g.championshipMatchDay,
          stagione: "2026/27",
          soglie: { base: 66, passo: 4 },
          fonte: "leghe.fantacalcio.it",
          classificaPrima,
          scontri: g.matches.map((m) => ({
            casa: mappa[m.tIdH],
            trasferta: mappa[m.tIdA],
            punteggioCasa: m.ptH,
            punteggioTrasferta: m.ptA,
            golCasa: +String(m.result).split("-")[0],
            golTrasferta: +String(m.result).split("-")[1],
            formazioneCasa: formazione(m.tIdH),
            formazioneTrasferta: formazione(m.tIdA),
          })),
        });
      }
      for (const m of g.matches) {
        punti[m.tIdH] = (punti[m.tIdH] || 0) + (m.standingPtH || 0);
        punti[m.tIdA] = (punti[m.tIdA] || 0) + (m.standingPtA || 0);
      }
    }
    return out;
  };

  /** formazioni inserite per la giornata n (capitano, vice, titolari), nel formato di dati/formazioni-N.json */
  const formazioni = async (n) => {
    const [cal, byId] = await Promise.all([calendario(), listaGiocatori()]);
    const g = cal.find((x) => x.matchDay === n);
    if (!g) throw new Error(`Giornata ${n} non trovata su fantacalcio.`);
    const L = await formazioniGiornata(g);
    const nome = (id) => byId.get(id)?.name || null;
    const squadre = {};
    for (const t of L) {
      if (!mappa[t.tid] || !(t.starts || []).length) continue;
      squadre[mappa[t.tid]] = {
        capitano: nome((t.capt || [])[0]),
        vice: nome((t.capt || [])[1]),
        modulo: t.mdl || null,
        titolari: t.starts.map((s) => nome(s.pid ?? s)).filter(Boolean),
      };
    }
    return { giornata: n, giornataSerieA: g.championshipMatchDay, aggiornato: new Date().toISOString(), fonte: "leghe.fantacalcio.it", squadre };
  };

  return { get, calendario, giornateCalcolate, formazioni };
};

/** Il comando da incollare nella console del browser su leghe.fantacalcio.it (lo mostra l'app) */
export const COMANDO_CONSOLE = `(async()=>{const H={};const o=XMLHttpRequest.prototype.open,s=XMLHttpRequest.prototype.setRequestHeader;XMLHttpRequest.prototype.open=function(m,u){this.__u=String(u);return o.apply(this,arguments)};XMLHttpRequest.prototype.setRequestHeader=function(k,v){if(/apileague/.test(this.__u)&&(k==='app_key'||k==='Authorization'))H[k]=v;return s.apply(this,arguments)};const l=[...document.querySelectorAll('a,button')].find(e=>/^\\s*Classifica\\s*$/i.test(e.textContent));if(l)l.click();for(let i=0;i<60&&!(H.app_key&&H.Authorization);i++)await new Promise(r=>setTimeout(r,100));if(!H.Authorization){alert('Non trovato: apri la pagina della lega (Dashboard) e riprova');return}const c=btoa(JSON.stringify({a:H.app_key,t:H.Authorization}));try{await navigator.clipboard.writeText(c)}catch(e){}prompt('Codice copiato! Incollalo nell\\'app Ciempions Fig:',c)})()`;
