// Pannello "Pre-giornata": sceglie i 4 big per squadra e genera copertina + 4 locandine delle sfide.
(() => {
  const $ = (s) => document.querySelector(s);
  const api = async (u, o) => {
    const r = await fetch(u, o);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.errore || (j.errori || []).join(", ") || `Errore ${r.status}`);
    return j;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let LEGA = null;
  let PRE = null;
  let attesa = null;

  const squadra = (id) => LEGA.squadre.find((s) => s.id === id);
  const opzioni = (id, scelto) =>
    [...squadra(id).rosa]
      .sort((a, b) => "PDCA".indexOf(a.ruolo) - "PDCA".indexOf(b.ruolo) || b.costo - a.costo)
      .map((p) => `<option value="${esc(p.nome)}" ${p.nome === scelto ? "selected" : ""}>${p.ruolo} · ${esc(p.nome)} (${p.costo})</option>`)
      .join("");

  const lato = (l, i, k) => {
    const sq = squadra(l.id);
    const cap = l.stelle.findIndex((s) => s.capitano);
    const ord = cap > 0 ? [l.stelle[cap], ...l.stelle.filter((_, j) => j !== cap)] : l.stelle;
    return `<div class="pre-lato"><b>${esc(sq.nome)}</b><div class="info">${l.posizione ?? "–"}° posto · ${l.punti ?? 0} pt · Mister ${esc(sq.presidente)}</div>
      ${[0, 1, 2, 3].map((j) => `<select data-s="${i}" data-l="${k}" data-j="${j}" title="${j === 0 ? "Capitano" : "Big " + (j + 1)}">${j === 0 ? "" : ""}${opzioni(l.id, ord[j]?.nome)}</select>`).join("")}
      <div class="info">Il primo è il capitano (C)</div></div>`;
  };

  const disegna = () => {
    $("#preSfide").innerHTML = PRE.sfide
      .map((s, i) => `<div class="pre-sfida"><h4>Sfida ${i + 1}</h4><div class="pre-lati">${lato(s.casa, i, "casa")}${lato(s.trasferta, i, "trasferta")}</div></div>`)
      .join("");
    galleria(PRE.file || []);
  };

  const galleria = (file) => {
    const t = Date.now();
    $("#preGalleria").innerHTML = file
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((f) => `<div class="file"><a href="${f.url}?t=${t}" target="_blank"><img src="${f.url}?t=${t}" alt="" loading="lazy"></a><div class="file-b"><span>${esc(f.nome)}</span><a href="${f.url}" download>Scarica</a><button class="wa-send" title="Manda nel gruppo WhatsApp" data-file="${esc(f.url.replace(/^\/out\//, ""))}">📲</button></div></div>`)
      .join("");
  };

  const leggiScelte = () => {
    const sfide = PRE.sfide.map((s) => ({ casa: { id: s.casa.id, stelle: [] }, trasferta: { id: s.trasferta.id, stelle: [] } }));
    document.querySelectorAll("#preSfide select").forEach((el) => {
      const l = sfide[+el.dataset.s][el.dataset.l];
      l.stelle[+el.dataset.j] = { nome: el.value, ...(el.dataset.j === "0" ? { capitano: true } : {}) };
    });
    for (const s of sfide)
      for (const l of [s.casa, s.trasferta]) {
        const nomi = l.stelle.map((x) => x.nome);
        if (new Set(nomi).size < 4) throw new Error(`${squadra(l.id).nome}: hai scelto due volte lo stesso giocatore.`);
      }
    return { giornata: PRE.giornata, sfide };
  };

  const carica = async (n) => {
    try {
      $("#preMsg").textContent = "";
      PRE = await api(`/api/pregiornata/${n}`);
      disegna();
      $("#preStato").textContent = `giornata ${n}`;
    } catch (e) {
      $("#preSfide").innerHTML = "";
      $("#preMsg").textContent = e.message;
    }
  };

  $("#preCarica").addEventListener("click", () => carica(+$("#preNum").value));
  $("#preGenera").addEventListener("click", async () => {
    try {
      const corpo = leggiScelte();
      const b = $("#preGenera");
      b.disabled = true;
      await api("/api/pregiornata", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      $("#preMsg").textContent = "In generazione… (circa un minuto)";
      clearInterval(attesa);
      const t0 = Date.now();
      attesa = setInterval(async () => {
        const lav = await api("/api/lavori").catch(() => []);
        const j = lav.find((x) => x.giornata === corpo.giornata && x.passi.some((p) => p.tipo === "pre"));
        if (j) {
          const fatti = j.passi.filter((p) => p.stato === "fatto").length;
          $("#preMsg").textContent = `In generazione… ${fatti}/${j.passi.length}`;
          const err = j.passi.find((p) => p.stato === "errore");
          if (err) $("#preMsg").textContent = `Errore su ${err.nome}: ${err.errore || ""}`;
          if (["fatto", "con errori", "annullato"].includes(j.stato) || Date.now() - t0 > 600000) {
            clearInterval(attesa);
            b.disabled = false;
            if (j.stato === "fatto") $("#preMsg").textContent = "Fatto ✔ Scarica le immagini qui sotto.";
            const nuovo = await api(`/api/pregiornata/${corpo.giornata}`);
            galleria(nuovo.file || []);
          }
        }
      }, 2500);
    } catch (e) {
      $("#preMsg").textContent = e.message;
      $("#preGenera").disabled = false;
    }
  });

  (async () => {
    try {
      LEGA = await api("/api/lega");
      const { prossima } = await api("/api/pregiornata");
      $("#preNum").value = prossima;
      $("#boxPre").addEventListener("toggle", () => { if ($("#boxPre").open && !PRE) carica(+$("#preNum").value); }, { once: false });
    } catch {}
  })();
})();
