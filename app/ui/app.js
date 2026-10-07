/* Fanta Highlights — interfaccia di inserimento (JS puro, nessuna build) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const RUOLI = ["P", "D", "C", "A"];
  const NOMI_RUOLO = { P: "Portieri", D: "Difensori", C: "Centrocampisti", A: "Attaccanti" };
  const SOGLIE = { base: 66, passo: 4 }; // regola della lega

  let LEGA = null;
  let G = null; // giornata in modifica (formato GiornataInput)
  let poll = null;

  /* ---------------- util ---------------- */
  const squadra = (id) => LEGA.squadre.find((s) => s.id === id);
  const logo = (s) => (!s || !s.logo ? "" : /^https?:/.test(s.logo) ? s.logo : `/public/${s.logo}`);
  const num = (v) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
  const golDa = (p) => (p == null || p < SOGLIE.base ? 0 : Math.floor((p - SOGLIE.base) / SOGLIE.passo) + 1);
  const fmt = (v) => (v == null ? "–" : String(v).replace(".", ","));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // Bonus/malus standard fantacalcio.it (Classic)
  const fantavotoAuto = (g) => {
    if (g.voto == null) return null;
    let fv = g.voto;
    fv += 3 * (g.gol || 0) + 1 * (g.assist || 0) + 3 * (g.rigoreParato || 0);
    fv -= 3 * (g.rigoreSbagliato || 0) + 2 * (g.autogol || 0) + 1 * (g.golSubiti || 0);
    if (g.ammonizione) fv -= 0.5;
    if (g.espulsione) fv -= 1;
    return Math.round(fv * 10) / 10;
  };

  const msg = (t, tipo = "") => {
    const m = $("#msg");
    m.textContent = t;
    m.className = "msg " + tipo;
  };

  const api = async (url, opt = {}) => {
    const r = await fetch(url, {
      ...opt,
      headers: { "Content-Type": "application/json" },
      body: opt.body ? JSON.stringify(opt.body) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.errore || (d.errori || []).join(" · ") || r.statusText), { dati: d });
    return d;
  };

  const salvaBozza = () => {
    try { localStorage.setItem("fh-bozza", JSON.stringify(G)); } catch {}
  };

  const nuovaGiornata = (n = 1) => {
    const ids = LEGA.squadre.map((s) => s.id);
    return {
      giornata: n,
      stagione: "2026/27",
      soglie: SOGLIE,
      scontri: [0, 1, 2, 3].map((i) => ({
        casa: ids[i * 2],
        trasferta: ids[i * 2 + 1],
        punteggioCasa: null,
        punteggioTrasferta: null,
        formazioneCasa: [],
        formazioneTrasferta: [],
      })),
    };
  };

  /* ---------------- classifica ---------------- */
  const disegnaClassifica = () => {
    const box = $("#classifica");
    const punti = Object.fromEntries((G.classificaPrima || []).map((r) => [r.allenatore, r.punti]));
    box.innerHTML = LEGA.squadre
      .map(
        (s) => `<label class="cl-riga"><img src="${logo(s)}" alt=""><span>${esc(s.nome)}</span>
        <input type="number" min="0" data-cl="${s.id}" value="${punti[s.id] ?? ""}" placeholder="pt"></label>`,
      )
      .join("");
    box.oninput = (e) => {
      const id = e.target.dataset.cl;
      if (!id) return;
      const righe = LEGA.squadre.map((s) => ({ allenatore: s.id, punti: num($(`[data-cl="${s.id}"]`, box).value) }));
      G.classificaPrima = righe.every((r) => r.punti == null) ? undefined : righe.map((r) => ({ ...r, punti: r.punti ?? 0 }));
      salvaBozza();
    };
  };

  /* ---------------- scontri ---------------- */
  const chiaveForm = (lato) => (lato === "casa" ? "formazioneCasa" : "formazioneTrasferta");
  const chiavePunti = (lato) => (lato === "casa" ? "punteggioCasa" : "punteggioTrasferta");

  const aggiornaTesta = (art, s) => {
    const a = squadra(s.casa), b = squadra(s.trasferta);
    const ga = golDa(s.punteggioCasa), gb = golDa(s.punteggioTrasferta);
    $(".sc-score", art).innerHTML =
      `<span class="sig">${esc(a?.sigla ?? "?")}</span>${s.punteggioCasa == null || s.punteggioTrasferta == null ? "vs" : `${ga} - ${gb}`}<span class="sig">${esc(b?.sigla ?? "?")}</span>` +
      `<span class="pt">${s.punteggioCasa == null && s.punteggioTrasferta == null ? "inserisci i fantapunti" : `${fmt(s.punteggioCasa)} · ${fmt(s.punteggioTrasferta)}`}</span>`;
    art.querySelectorAll(".lato").forEach((el) => {
      const lato = el.dataset.lato;
      const p = s[chiavePunti(lato)];
      const g = $(".gol b", el);
      if (g) g.textContent = p == null ? "–" : golDa(p);
    });
  };

  const rigaGiocatore = (g, i) => {
    const isP = g.ruolo === "P";
    const n = (k, cls = "mini") => `<input type="number" min="0" class="${cls}" data-k="${k}" data-i="${i}" value="${g[k] || ""}" placeholder="0">`;
    const auto = fantavotoAuto(g);
    return `<tr>
      <td><div class="nomeg"><span class="ruolo ${g.ruolo}">${g.ruolo}</span>${esc(g.nome)}</div></td>
      <td><input type="number" step="0.5" min="0" max="10" data-k="voto" data-i="${i}" value="${g.voto ?? ""}" placeholder="s.v."></td>
      <td><input type="number" step="0.5" class="fv" data-k="fantavoto" data-i="${i}" value="${g._fvManuale ? g.fantavoto ?? "" : ""}" placeholder="${auto == null ? "auto" : fmt(auto)}" title="Vuoto = calcolato in automatico"></td>
      <td>${n("gol")}</td>
      <td>${n("assist")}</td>
      <td><input type="checkbox" class="cart" data-k="ammonizione" data-i="${i}" ${g.ammonizione ? "checked" : ""}></td>
      <td><input type="checkbox" class="cart rosso" data-k="espulsione" data-i="${i}" ${g.espulsione ? "checked" : ""}></td>
      <td class="opz">${n("rigoreSbagliato")}</td>
      <td class="opz">${n("autogol")}</td>
      <td class="opz">${isP ? n("rigoreParato") : ""}</td>
      <td class="opz">${isP ? n("golSubiti") : ""}</td>
      <td><button class="via" data-via="${i}" title="Togli">✕</button></td>
    </tr>`;
  };

  const disegnaLato = (art, s, si, lato) => {
    const el = $(`.lato[data-lato="${lato}"]`, art);
    const sq = squadra(s[lato]);
    const form = s[chiaveForm(lato)];
    el.style.setProperty("--col", sq?.colori.primario ?? "var(--line)");
    const opzSquadre = LEGA.squadre
      .map((x) => `<option value="${x.id}" ${x.id === s[lato] ? "selected" : ""}>${esc(x.nome)}</option>`)
      .join("");
    const giaUsati = new Set(form.map((g) => g.nome));
    const opzGioc = sq
      ? RUOLI.map(
          (r) =>
            `<optgroup label="${NOMI_RUOLO[r]}">${sq.rosa
              .filter((g) => g.ruolo === r && !giaUsati.has(g.nome))
              .map((g) => `<option value="${esc(g.nome)}">${esc(g.nome)}</option>`)
              .join("")}</optgroup>`,
        ).join("")
      : "";
    el.innerHTML = `
      <div class="lato-head">
        <img src="${logo(sq)}" alt="">
        <div><select class="selSquadra">${opzSquadre}</select><div class="pres">${lato === "casa" ? "Casa" : "Trasferta"} · ${esc(sq?.presidente ?? "")}</div></div>
        <label class="punti">Fantapunti<input type="number" step="0.5" class="inPunti" value="${s[chiavePunti(lato)] ?? ""}" placeholder="pt"></label>
        <div class="gol"><b>–</b><small>gol</small></div>
      </div>
      ${
        form.length
          ? `<table class="gioc"><thead><tr><th>Giocatore</th><th>Voto</th><th>FV</th><th title="Gol">G</th><th title="Assist">A</th><th title="Ammonizione">Amm</th><th title="Espulsione">Esp</th><th class="opz" title="Rigore sbagliato">RS</th><th class="opz" title="Autogol">AG</th><th class="opz" title="Rigore parato (portiere)">RP</th><th class="opz" title="Gol subiti (portiere)">GS</th><th></th></tr></thead>
             <tbody>${form.map(rigaGiocatore).join("")}</tbody></table>`
          : `<p class="legenda">Aggiungi i giocatori che hanno fatto qualcosa: marcatori, assist, cartellini, rigori, il portiere, i disastri.</p>`
      }
      <div class="aggiungi"><select class="selGioc"><option value="">+ Aggiungi giocatore…</option>${opzGioc}</select></div>`;

    $(".selSquadra", el).onchange = (e) => {
      s[lato] = e.target.value;
      s[chiaveForm(lato)] = [];
      salvaBozza();
      disegnaScontro(art, s, si);
    };
    $(".inPunti", el).oninput = (e) => {
      s[chiavePunti(lato)] = num(e.target.value);
      salvaBozza();
      aggiornaTesta(art, s);
    };
    $(".selGioc", el).onchange = (e) => {
      const nome = e.target.value;
      if (!nome) return;
      const r = sq.rosa.find((g) => g.nome === nome);
      form.push({ nome: r.nome, ruolo: r.ruolo, voto: null });
      form.sort((a, b) => RUOLI.indexOf(a.ruolo) - RUOLI.indexOf(b.ruolo));
      salvaBozza();
      disegnaLato(art, s, si, lato);
      aggiornaTesta(art, s);
    };
    const tab = $("table", el);
    if (tab) {
      tab.oninput = tab.onchange = (e) => {
        const t = e.target;
        const i = Number(t.dataset.i);
        const k = t.dataset.k;
        if (!k) return;
        const g = form[i];
        if (t.type === "checkbox") g[k] = t.checked || undefined;
        else if (k === "fantavoto") {
          g.fantavoto = num(t.value);
          g._fvManuale = g.fantavoto != null;
        } else g[k] = num(t.value) ?? undefined;
        // aggiorna il fantavoto suggerito
        const fvIn = tab.querySelector(`input[data-k="fantavoto"][data-i="${i}"]`);
        const auto = fantavotoAuto(g);
        if (fvIn) fvIn.placeholder = auto == null ? "auto" : fmt(auto);
        salvaBozza();
      };
      tab.onclick = (e) => {
        const v = e.target.dataset.via;
        if (v === undefined) return;
        form.splice(Number(v), 1);
        salvaBozza();
        disegnaLato(art, s, si, lato);
        aggiornaTesta(art, s);
      };
    }
  };

  const disegnaScontro = (art, s, si) => {
    $(".sc-num", art).textContent = `Scontro ${si + 1}`;
    const derby = $(".derby", art);
    derby.checked = (s.tag || []).includes("derby");
    derby.onchange = () => {
      s.tag = derby.checked ? ["derby"] : undefined;
      salvaBozza();
    };
    const nome = $(".nomeSfida", art);
    nome.value = s.nomeSfida || "";
    nome.oninput = () => {
      s.nomeSfida = nome.value.trim() || undefined;
      salvaBozza();
    };
    $(".genUno", art).onclick = () => genera([si]);
    disegnaLato(art, s, si, "casa");
    disegnaLato(art, s, si, "trasferta");
    aggiornaTesta(art, s);
  };

  const disegnaTutto = () => {
    $("#numGiornata").value = G.giornata;
    disegnaClassifica();
    const box = $("#scontri");
    box.innerHTML = "";
    G.scontri.forEach((s, si) => {
      const art = $("#tplScontro").content.firstElementChild.cloneNode(true);
      box.appendChild(art);
      disegnaScontro(art, s, si);
    });
    caricaGalleria();
  };

  /* ---------------- salvataggio / generazione ---------------- */
  const pulisci = () => {
    const pulisciG = (g) => {
      const o = { ...g, voto: g.voto ?? null };
      for (const k of ["gol", "assist", "rigoreSbagliato", "rigoreParato", "autogol", "golSubiti", "ammonizione", "espulsione", "fantavoto", "_fvManuale"]) delete o[k];
      o.fantavoto = g._fvManuale && g.fantavoto != null ? g.fantavoto : fantavotoAuto(g);
      for (const k of ["gol", "assist", "rigoreSbagliato", "rigoreParato", "autogol", "golSubiti"]) if (g[k]) o[k] = g[k];
      if (g.ammonizione) o.ammonizione = true;
      if (g.espulsione) o.espulsione = true;
      if (g._fvManuale) o._fvManuale = true;
      return o;
    };
    return {
      ...G,
      giornata: Number(G.giornata),
      scontri: G.scontri.map((s) => ({
        ...s,
        formazioneCasa: s.formazioneCasa.map(pulisciG),
        formazioneTrasferta: s.formazioneTrasferta.map(pulisciG),
      })),
    };
  };

  const salva = async () => {
    try {
      await api("/api/giornata", { method: "POST", body: pulisci() });
      msg(`Giornata ${G.giornata} salvata ✓`, "ok");
      caricaElenco();
    } catch (e) {
      msg(e.message, "err");
    }
  };

  const genera = async (scontri) => {
    const tipi = [];
    if ($("#optLoc").checked) tipi.push("locandina", "presentazione");
    if ($("#optVideo").checked) tipi.push("video");
    if (!tipi.length) return msg("Scegli almeno Video o Locandine", "err");
    // telecronaca non pronta: la prima volta avvisa e apre il pannello, al secondo click genera senza voce
    if (tipi.includes("video") && IMP && !vocePronta() && !genera.senzaVoceOk) {
      genera.senzaVoceOk = true;
      const box = $("#boxVoce");
      box.open = true;
      box.scrollIntoView({ behavior: "smooth", block: "start" });
      return msg(
        IMP.voce.attiva
          ? "Manca la chiave per la voce: incollala e premi Salva chiave. (Premi di nuovo Genera per fare i video senza voce.)"
          : "La telecronaca è spenta: spunta “Aggiungi la voce”. (Premi di nuovo Genera per fare i video senza voce.)",
        "err",
      );
    }
    genera.senzaVoceOk = false;
    // chiude i video della galleria: su Windows un file aperto non può essere sovrascritto
    document.querySelectorAll("#galleria video").forEach((v) => {
      v.pause();
      v.removeAttribute("src");
      v.load();
    });
    try {
      await api("/api/genera", { method: "POST", body: { giornata: pulisci(), scontri, tipi } });
      msg("Generazione avviata: puoi continuare a lavorare, ti avviso quando ha finito.", "ok");
      caricaElenco();
      seguiLavori();
    } catch (e) {
      msg(e.message, "err");
    }
  };

  /* ---------------- avanzamento ---------------- */
  const disegnaLavori = (lavori) => {
    const box = $("#lavori");
    $("#boxLavori").hidden = lavori.length === 0;
    box.innerHTML = lavori
      .slice(0, 3)
      .map(
        (j) => `<div class="lavoro">
          <div class="lavoro-h"><span>Giornata ${j.giornata} · ${new Date(j.creato).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span><span>${j.stato}</span></div>
          ${j.passi
            .map(
              (p) => `<div class="passo ${p.stato === "fatto" ? "fatto" : p.stato === "errore" ? "errore" : ""}">
                <span>${p.nome}</span><div class="barra"><i style="width:${Math.round(p.progresso * 100)}%"></i></div>
                <span class="st">${p.stato === "in corso" ? Math.round(p.progresso * 100) + "%" : p.stato}</span></div>
                ${p.errore ? `<pre class="err">${esc(p.errore)}</pre>` : ""}
                ${p.avviso ? `<div class="legenda">⚠ ${esc(p.avviso)}</div>` : ""}`,
            )
            .join("")}
        </div>`,
      )
      .join("");
  };

  let galleriaFirma = "";
  const seguiLavori = () => {
    if (poll) return;
    const giro = async () => {
      try {
        const lavori = await api("/api/lavori");
        disegnaLavori(lavori);
        const firma = lavori.map((j) => j.passi.filter((p) => p.stato === "fatto").length).join(",");
        if (firma !== galleriaFirma) {
          galleriaFirma = firma;
          caricaGalleria();
        }
        const attivi = lavori.some((j) => j.stato === "in corso" || j.stato === "in coda");
        if (!attivi) {
          clearInterval(poll);
          poll = null;
          const ultimo = lavori[0];
          if (ultimo) msg(ultimo.stato === "fatto" ? "Fatto! Trovi tutto qui sotto e nella cartella out." : `Generazione: ${ultimo.stato}`, ultimo.stato === "fatto" ? "ok" : "err");
          $("#btnGenera").disabled = false;
        } else $("#btnGenera").disabled = true;
      } catch {}
    };
    poll = setInterval(giro, 1000);
    giro();
  };

  /* ---------------- galleria / elenco ---------------- */
  let ELENCO = [];
  const caricaElenco = async () => {
    ELENCO = await api("/api/giornate").catch(() => []);
    const sel = $("#caricaGiornata");
    sel.innerHTML = `<option value="">Giornate salvate…</option>` + ELENCO.map((g) => `<option value="${g.numero}">Giornata ${g.numero}</option>`).join("");
  };

  const caricaGalleria = async () => {
    await caricaElenco();
    const n = Number(G.giornata);
    $("#galleriaNum").textContent = n;
    const voce = ELENCO.find((g) => g.numero === n);
    const file = (voce?.file || []).sort((a, b) => (a.nome.endsWith(".mp4") === b.nome.endsWith(".mp4") ? a.nome.localeCompare(b.nome) : a.nome.endsWith(".mp4") ? -1 : 1));
    const t = Date.now();
    $("#galleria").innerHTML = file.length
      ? file
          .map((f) =>
            `<div class="file">${
              f.nome.endsWith(".mp4")
                ? `<video src="${f.url}?t=${t}#t=3" controls preload="metadata" playsinline></video>`
                : `<a href="${f.url}?t=${t}" target="_blank"><img src="${f.url}?t=${t}" alt="" loading="lazy"></a>`
            }<div class="file-b"><span title="${esc(f.nome)}">${esc(f.nome)}</span><a href="${f.url}" download>Scarica</a></div></div>`,
          )
          .join("")
      : `<p class="vuoto">Ancora niente. Compila gli scontri e premi "Genera".</p>`;
  };

  const apri = async (n) => {
    try {
      G = await api(`/api/giornata/${n}`);
      // i fantavoti importati sono quelli ufficiali: non ricalcolarli
      G.scontri.forEach((s) =>
        ["formazioneCasa", "formazioneTrasferta"].forEach((k) => {
          s[k] = s[k] || [];
          s[k].forEach((g) => { if (g.fantavoto != null) g._fvManuale = true; });
        }),
      );
      salvaBozza();
      disegnaTutto();
      msg(`Giornata ${n} caricata`, "ok");
    } catch (e) {
      msg(e.message, "err");
    }
  };

  /* ---------------- telecronaca parlata ---------------- */
  const AIUTO = {
    gemini:
      'Gratis: vai su <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>, entra con un account Google e premi "Create API key". Il piano gratuito ha un limite di richieste: le frasi già generate vengono riusate, quindi ogni giornata ne consuma poche.',
    windows: "Nessun account: usa le voci installate in Windows (per l'italiano di solito Elsa o Cosimo). Suonano più robotiche, ma vanno sempre, anche offline.",
    elevenlabs: "A pagamento per la voce clonata (piano Starter). Chiave da elevenlabs.io → Profilo → API Keys.",
  };
  let IMP = null;
  const vocePronta = () => {
    const v = IMP?.voce;
    if (!v?.attiva) return false;
    return v.provider === "windows" || !!v.chiaviPresenti?.[v.provider];
  };
  const disegnaVoce = (imp) => {
    IMP = imp;
    const v = imp.voce;
    const p = v.provider;
    const amb = imp.ambiente || {};
    // sul server non ci sono le voci di Windows né una cartella da aprire
    const optWin = $("#voceProvider").querySelector('option[value="windows"]');
    if (optWin) optWin.hidden = optWin.disabled = amb.windows === false;
    if (amb.server) $("#btnCartella").hidden = true;
    $("#voceAttiva").checked = v.attiva;
    $("#voceProvider").value = p;
    $("#rigaChiave").hidden = p === "windows";
    $("#rigaStile").hidden = p !== "gemini";
    $("#etichettaChiave").textContent = p === "gemini" ? "Chiave Google AI Studio" : "Chiave ElevenLabs";
    $("#voceChiave").placeholder = v.chiaviPresenti[p] ? "chiave salvata ✓ (incolla per sostituirla)" : "incolla qui la chiave";
    if (document.activeElement !== $("#voceStile")) $("#voceStile").value = v.stile || "";
    $("#voceAiuto").innerHTML = AIUTO[p] + " Le chiavi restano solo su questo PC.";
    const nomi = { gemini: "Gemini", windows: "Windows", elevenlabs: "ElevenLabs" };
    $("#statoVoce").textContent = !v.attiva
      ? "disattivata — i video escono senza voce"
      : vocePronta()
        ? `attiva · ${nomi[p]} · ${v.voce[p] || "nessuna voce"}`
        : `attiva ma manca la chiave ${nomi[p]}`;
    $("#statoVoce").style.color = vocePronta() ? "var(--lime)" : "var(--gold)";
  };
  const salvaVoce = async (voce) => disegnaVoce(await api("/api/impostazioni", { method: "POST", body: { voce } }));
  const caricaVoci = async () => {
    const p = IMP.voce.provider;
    const sel = $("#voceScelta");
    try {
      const voci = await api("/api/voci?provider=" + p);
      sel.innerHTML = `<option value="">— scegli —</option>` + voci.map((v) => `<option value="${esc(v.id)}">${esc(v.nome)}</option>`).join("");
      sel.value = IMP.voce.voce[p] || "";
      if (!sel.value && voci[0] && p !== "elevenlabs") {
        sel.value = voci[0].id;
        await salvaVoce({ voce: { provider: p, id: voci[0].id } });
      }
    } catch (e) {
      sel.innerHTML = `<option value="">${p === "elevenlabs" ? "— prima salva la chiave —" : "— non disponibile —"}</option>`;
      msg(e.message, "err");
    }
  };
  const avviaVoce = async () => {
    disegnaVoce(await api("/api/impostazioni"));
    if (!vocePronta()) $("#boxVoce").open = true;
    await caricaVoci();
    $("#voceAttiva").onchange = (e) => salvaVoce({ attiva: e.target.checked }).catch((er) => msg(er.message, "err"));
    $("#voceProvider").onchange = async (e) => {
      await salvaVoce({ provider: e.target.value });
      caricaVoci();
    };
    $("#voceSalvaChiave").onclick = async () => {
      const k = $("#voceChiave").value.trim();
      if (!k) return msg("Incolla prima la chiave", "err");
      await salvaVoce({ chiave: { provider: IMP.voce.provider, valore: k } });
      $("#voceChiave").value = "";
      msg("Chiave salvata su questo PC ✓", "ok");
      caricaVoci();
    };
    $("#voceCarica").onclick = caricaVoci;
    $("#voceScelta").onchange = (e) => salvaVoce({ voce: { provider: IMP.voce.provider, id: e.target.value } });
    $("#voceStile").onchange = (e) => salvaVoce({ stile: e.target.value });
    $("#voceProva").onclick = async () => {
      try {
        $("#voceProva").disabled = true;
        msg("Genero la prova…");
        const r = await api("/api/prova-voce", { method: "POST", body: {} });
        const a = $("#voceAudio");
        a.hidden = false;
        a.src = r.url + "?t=" + Date.now();
        a.play().catch(() => {});
        msg("Ecco la voce ✓", "ok");
      } catch (e) {
        msg(e.message, "err");
      } finally {
        $("#voceProva").disabled = false;
      }
    };
  };

  /* ---------------- avvio ---------------- */
  const avvia = async () => {
    LEGA = await api("/api/lega");
    $("#nomeLega").textContent = `${LEGA.lega} · ${LEGA.competizione}`;
    try {
      const b = JSON.parse(localStorage.getItem("fh-bozza") || "null");
      if (b && Array.isArray(b.scontri)) G = b;
    } catch {}
    // se c'è una giornata importata più recente della bozza, apri quella
    await caricaElenco();
    const ultima = ELENCO[0]?.numero;
    if (ultima && (!G || ultima > Number(G.giornata))) {
      await apri(ultima);
      msg(`Giornata ${ultima} importata da fantacalcio.it: controlla e premi "Genera tutto".`, "ok");
    } else {
      if (!G) G = nuovaGiornata(1);
      disegnaTutto();
    }

    $("#numGiornata").oninput = (e) => {
      const n = num(e.target.value);
      if (n && n > 0) {
        G.giornata = n;
        salvaBozza();
        caricaGalleria();
      }
    };
    $("#caricaGiornata").onchange = (e) => e.target.value && apri(e.target.value);
    $("#btnNuova").onclick = () => {
      if (!confirm("Svuotare il modulo e iniziare una nuova giornata?")) return;
      const prossima = Math.max(Number(G.giornata) || 0, ...ELENCO.map((g) => g.numero)) + 1;
      G = nuovaGiornata(prossima);
      salvaBozza();
      disegnaTutto();
    };
    $("#btnSalva").onclick = salva;
    $("#btnGenera").onclick = () => genera(G.scontri.map((_, i) => i));
    $("#btnCartella").onclick = () => api(`/api/apri-cartella/${G.giornata}`, { method: "POST" }).catch(() => {});
    seguiLavori();
    avviaVoce().catch(() => {});
  };

  avvia().catch((e) => msg("Errore di avvio: " + e.message, "err"));
})();
