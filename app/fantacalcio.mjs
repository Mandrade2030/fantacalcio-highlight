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

/** Con `dati` ({percorso: json}) non chiama il sito: usa le risposte già scaricate dal telefono di Davide
 *  (il server AWS è bloccato da fantacalcio, il telefono no). */
export const creaClient = ({ appKey, token } = {}, mappa, dati = null) => {
  const get = async (path) => {
    if (dati) {
      const k = path.split("?")[0];
      if (dati[k] === undefined) throw new Error(`Dato mancante dal telefono: ${k}`);
      return dati[k];
    }
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

  /** giornate di cui servono le formazioni, dato il calendario: quelle mancanti fino all'ultima calcolata + la prossima (pre-giornata) */
  const percorsoFormazioni = (g) => `/gaming/v1/teamLineup/${COMPETIZIONE}/${g.matchDay}/${g.championshipMatchDay}`;
  return { get, calendario, giornateCalcolate, formazioni, percorsoFormazioni };
};

/** Il comando da incollare nella console del browser su leghe.fantacalcio.it (lo mostra l'app) */
export const COMANDO_CONSOLE = `(async()=>{const H={};const o=XMLHttpRequest.prototype.open,s=XMLHttpRequest.prototype.setRequestHeader;XMLHttpRequest.prototype.open=function(m,u){this.__u=String(u);return o.apply(this,arguments)};XMLHttpRequest.prototype.setRequestHeader=function(k,v){if(/apileague/.test(this.__u)&&(k==='app_key'||k==='Authorization'))H[k]=v;return s.apply(this,arguments)};const l=[...document.querySelectorAll('a,button')].find(e=>/^\\s*Classifica\\s*$/i.test(e.textContent));if(l)l.click();for(let i=0;i<60&&!(H.app_key&&H.Authorization);i++)await new Promise(r=>setTimeout(r,100));if(!H.Authorization){alert('Non trovato: apri la pagina della lega (Dashboard) e riprova');return}const c=btoa(JSON.stringify({a:H.app_key,t:H.Authorization}));try{await navigator.clipboard.writeText(c)}catch(e){}prompt('Codice copiato! Incollalo nell\\'app Ciempions Fig:',c)})()`;

/** Segnalibro per il telefono: lo avvii TU sulla pagina della tua lega (sei già loggato) e raccoglie calendario, voti e
 *  formazioni; poi li copi e li incolli nell'app. Stessa cosa del comando da console, ma da cellulare. */
const CODICE_SEGNALIBRO = `(async()=>{
try{
var H={};var o=XMLHttpRequest.prototype.open,s=XMLHttpRequest.prototype.setRequestHeader;
XMLHttpRequest.prototype.open=function(m,u){this.__u=String(u);return o.apply(this,arguments)};
XMLHttpRequest.prototype.setRequestHeader=function(k,v){if(/apileague/.test(this.__u)&&(k==='app_key'||k==='Authorization'))H[k]=v;return s.apply(this,arguments)};
var box=document.createElement('div');box.style.cssText='position:fixed;z-index:99999;left:8px;right:8px;top:8px;background:#121629;color:#fff;border:2px solid #c6ff2e;border-radius:12px;padding:12px;font:15px sans-serif';
box.textContent='Leggo la lega... un attimo';document.body.appendChild(box);
var l=[].slice.call(document.querySelectorAll('a,button')).find(function(e){return /^\\s*Classifica\\s*$/i.test(e.textContent)});if(l)l.click();
for(var i=0;i<100&&!(H.app_key&&H.Authorization);i++)await new Promise(function(r){setTimeout(r,100)});
if(!H.Authorization){box.textContent='Apri prima la pagina della tua lega (Dashboard), con il login fatto, e riprova.';return}
var g=async function(p){var r=await fetch('https://apileague.fantacalcio.it'+p,{headers:{app_key:H.app_key,Authorization:H.Authorization,Accept:'application/json'}});if(!r.ok)throw new Error(r.status+' '+p);return r.json()};
var UP='__UP__';var C=645622,K='/onboarding/v1/league/competition/calendar/'+C,D={};
var cal=await g(K);
D[K]=cal.map(function(x){return{matchDay:x.matchDay,championshipMatchDay:x.championshipMatchDay,calculated:x.calculated,matches:(x.matches||[]).map(function(m){return{tIdH:m.tIdH,tIdA:m.tIdA,ptH:m.ptH,ptA:m.ptA,result:m.result,standingPtH:m.standingPtH,standingPtA:m.standingPtA}})}});
var pl=await g('/onboarding/v1/league/players');
D['/onboarding/v1/league/players']={players:(pl.players||[]).map(function(p){return{id:p.id,name:p.name,fcrle:p.fcrle,tname:p.tname,img:p.img}})};
var P=function(x){return x&&typeof x==='object'?{pid:x.pid,scr:x.scr,cscr:x.cscr,ptype:x.ptype,b:x.b}:x};
var last=0;cal.forEach(function(x){if(x.calculated)last=x.matchDay});
for(var j=0;j<cal.length;j++){var x=cal[j];if(x.matchDay>last+1)break;if(x.matchDay<last-1)continue;box.textContent='Scarico giornata '+x.matchDay+'...';
var path='/gaming/v1/teamLineup/'+C+'/'+x.matchDay+'/'+x.championshipMatchDay;
try{var L=await g(path);D[path]=L.map(function(t){return{tid:t.tid,tot:t.tot,capt:t.capt,mdl:t.mdl,starts:(t.starts||[]).map(P),bench:(t.bench||[]).map(P)}})}catch(e){if(x.matchDay<=last)throw e}}
var txt=JSON.stringify(D);box.textContent='';
if(UP){box.textContent='Invio al server...';try{var rr=await fetch(UP,{method:'POST',headers:{'Content-Type':'text/plain'},body:txt});var jj=await rr.json();if(!rr.ok)throw new Error(jj.errore||rr.status);var nn=(jj.nuove||[]).concat(jj.aggiornate||[]);box.textContent=nn.length?'Fatto! Importata la giornata '+nn.join(', ')+'. Sto generando tutto: ti arriva il riepilogo su WhatsApp.':'Fatto: niente di nuovo, e' + String.fromCharCode(39) + ' gia tutto aggiornato (calcolate fino alla '+last+').';return}catch(e){box.textContent='Invio non riuscito ('+e.message+'). Copia a mano.';await new Promise(function(r){setTimeout(r,1500)});box.textContent=''}}
var m=document.createElement('div');m.textContent='Fatto (giornate fino alla '+last+'). Premi Copia, poi apri l\\'app Ciempions Fig e incolla.';box.appendChild(m);
var ta=document.createElement('textarea');ta.value=txt;ta.rows=2;ta.style.cssText='width:100%;margin:8px 0';box.appendChild(ta);
var b=document.createElement('button');b.textContent='Copia';b.style.cssText='padding:10px 18px;font-size:16px;font-weight:700;background:#c6ff2e;border:0;border-radius:8px';
b.onclick=function(){ta.select();ta.setSelectionRange(0,txt.length+1);var ok=false;try{ok=document.execCommand('copy')}catch(e){}if(!ok&&navigator.clipboard)navigator.clipboard.writeText(txt);b.textContent='Copiato! Ora apri l\\'app'};
box.appendChild(b);
}catch(e){var bx=document.querySelector('div[style*="99999"]');if(bx)bx.textContent='Errore: '+e.message}
})();`;
/** Lo script che il segnalibro carica dal server (una riga corta sul telefono); `up` = indirizzo di caricamento diretto */
export const scriptSegnalibro = (up) => CODICE_SEGNALIBRO.replace("__UP__", up).replace(/\s*\n\s*/g, "");
export const SEGNALIBRO = "javascript:" + scriptSegnalibro("");
