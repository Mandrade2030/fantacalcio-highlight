// Pannello "🔗 Fantacalcio": collegamento con la chiave di lega, import delle giornate, automatico.
(() => {
  const $ = (s) => document.querySelector(s);
  const api = async (u, o) => {
    const r = await fetch(u, o);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.errore || `Errore ${r.status}`);
    return j;
  };
  const post = (u, body) => api(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  const msg = (t, err) => {
    $("#fcMsg").textContent = t || "";
    $("#fcMsg").style.color = err ? "#ff6b6b" : "";
  };
  const data = (iso) => (iso ? new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "mai");

  const aggiorna = async () => {
    try {
      const s = await api("/api/fantacalcio");
      $("#fcStato").textContent = s.collegato ? `collegato · chiave valida fino al ${s.scade ? new Date(s.scade).toLocaleDateString("it-IT") : "?"}` : "non collegato";
      $("#fcOk").hidden = !s.collegato;
      $("#fcSetup").hidden = s.collegato;
      $("#fcScollega").hidden = !s.collegato;
      $("#fcComando").value = s.comando;
      $("#fcAuto").checked = s.automatico;
      const ui = s.ultimoImport;
      $("#fcInfo").textContent =
        `Ultimo controllo: ${data(s.ultimoControllo)}` +
        (ui ? ` · ultimo import: ${ui.nuove.length ? "nuove " + ui.nuove.join(", ") : "nessuna giornata nuova"}${ui.aggiornate.length ? " · aggiornate " + ui.aggiornate.join(", ") : ""}` : "") +
        (s.errore ? ` · ⚠️ ${s.errore}` : "");
      if (!s.collegato && !$("#boxFanta").open) $("#fcStato").textContent = "non collegato: aprimi per collegare";
    } catch (e) {
      $("#fcStato").textContent = "non disponibile";
    }
  };

  $("#fcCopia").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("#fcComando").value);
      msg("Comando copiato ✔ Ora incollalo nella console di fantacalcio.");
    } catch {
      $("#fcComando").select();
      msg("Selezionato: copialo con Ctrl+C.");
    }
  });
  $("#fcSalva").addEventListener("click", async () => {
    msg("Provo la chiave…");
    try {
      const r = await post("/api/fantacalcio/chiave", { codice: $("#fcCodice").value });
      $("#fcCodice").value = "";
      msg(`Collegato ✔ La chiave vale fino al ${r.scade ? new Date(r.scade).toLocaleDateString("it-IT") : "?"}.`);
      aggiorna();
    } catch (e) {
      msg(e.message, true);
    }
  });
  $("#fcScollega").addEventListener("click", async () => {
    if (!confirm("Scollegare fantacalcio? Dovrai rifare la procedura con la console.")) return;
    await post("/api/fantacalcio/chiave", { scollega: true });
    aggiorna();
  });
  $("#fcAuto").addEventListener("change", async (e) => {
    await post("/api/fantacalcio/automatico", { attivo: e.target.checked });
    msg(e.target.checked ? "Automatico attivo." : "Automatico spento: importa a mano col tasto.");
  });
  const importa = (genera) => async () => {
    msg("Chiedo a fantacalcio…");
    try {
      const r = await post("/api/fantacalcio/importa", { genera });
      const n = [...r.nuove, ...r.aggiornate];
      msg(
        n.length
          ? `Importate: giornata ${n.join(", ")} ✔${genera ? " Generazione partita (qualche minuto): segui l'avanzamento qui sotto. Alla fine ti arriva il riepilogo in privato." : " Aprila dal menu delle giornate."}`
          : `Niente di nuovo: calcolate fino alla giornata ${Math.max(...r.calcolate, 0)}, già tutte nell'app.`,
      );
      aggiorna();
    } catch (e) {
      msg(e.message, true);
    }
  };
  $("#fcImporta").addEventListener("click", importa(true));
  $("#fcSoloImporta").addEventListener("click", importa(false));

  aggiorna();
  $("#boxFanta").addEventListener("toggle", aggiorna);
})();
