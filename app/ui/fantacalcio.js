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

  // Dentro l'app Android la chiave sta sul telefono e i dati li scarica il telefono (il server è bloccato da fantacalcio)
  const tel = null; // (vecchia app Android: il telefono non può leggere fantacalcio, vedi segnalibro)
  let segnalibro = "";
  const statoTel = () => {
    try {
      return JSON.parse(tel.stato());
    } catch {
      return {};
    }
  };

  const aggiorna = async () => {
    try {
      const s = await api("/api/fantacalcio");
      if (tel) {
        const t = statoTel();
        s.collegato = !!t.chiave;
        s.scade = null;
        $("#fcStato").textContent = t.chiave ? `telefono · ${t.esito ? t.esito.slice(0, 40) : "in attesa del primo controllo"}` : "non collegato: aprimi per collegare";
        $("#fcOk").hidden = !t.chiave;
        $("#fcSetup").hidden = !!t.chiave;
        $("#fcScollega").hidden = !t.chiave;
        $("#fcComando").value = s.comando;
      segnalibro = s.segnalibro;
        $("#fcAuto").checked = s.automatico;
        $("#fcInfo").textContent = `Il telefono controlla fantacalcio ogni ora (8–23) anche ad app chiusa. Ultimo controllo: ${data(t.quando ? new Date(t.quando).toISOString() : null)} · ${t.esito || "nessun esito"}`;
        return;
      }
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

  $("#fcCopiaSegn").addEventListener("click", async () => {
    const m = $("#fcMsgTel");
    if (!segnalibro) await aggiorna();
    const ta = $("#fcSegn");
    ta.value = segnalibro || "";
    ta.hidden = false;
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    if (!ok) {
      try {
        await navigator.clipboard.writeText(ta.value);
        ok = true;
      } catch {}
    }
    m.textContent = ok ? " ✔ Copiato! Ora salvalo in Chrome come descritto qui sotto." : " Il testo qui sotto è selezionato: tienilo premuto e scegli «Copia».";
    m.style.color = ok ? "" : "#ffb347";
  });
  $("#fcCarica").addEventListener("click", async () => {
    const t = $("#fcDati").value.trim();
    if (!t.startsWith("{")) return msg("Incolla prima i dati copiati dal segnalibro.", true);
    msg("Carico i dati…");
    try {
      const r = await api("/api/fantacalcio/dati", { method: "POST", headers: { "Content-Type": "application/json" }, body: t });
      $("#fcDati").value = "";
      const n = [...r.nuove, ...r.aggiornate];
      msg(n.length ? `Importate: giornata ${n.join(", ")} ✔ Generazione in corso (qualche minuto): alla fine ti arriva il riepilogo in privato.` : `Niente di nuovo: già tutto nell'app.${r.formazioniSalvate ? " Formazioni della giornata " + r.formazioniSalvate + " aggiornate." : ""}`);
      aggiorna();
    } catch (e) {
      msg(e.message, true);
    }
  });
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
    if (tel) {
      const r = tel.salvaChiave($("#fcCodice").value);
      if (r === "ok") {
        $("#fcCodice").value = "";
        msg("Chiave salvata sul telefono ✔ Sto controllando fantacalcio, tra qualche secondo vedi l'esito qui sopra.");
        setTimeout(aggiorna, 4000);
        setTimeout(aggiorna, 12000);
      } else msg(r, true);
      return;
    }
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
    if (tel) {
      tel.scollega();
      return aggiorna();
    }
    await post("/api/fantacalcio/chiave", { scollega: true });
    aggiorna();
  });
  $("#fcAuto").addEventListener("change", async (e) => {
    await post("/api/fantacalcio/automatico", { attivo: e.target.checked });
    msg(e.target.checked ? "Automatico attivo." : "Automatico spento: importa a mano col tasto.");
  });
  const importa = (genera) => async () => {
    if (tel) {
      tel.importaOra();
      msg("Il telefono sta controllando fantacalcio… tra qualche secondo vedi l'esito.");
      setTimeout(aggiorna, 5000);
      setTimeout(aggiorna, 15000);
      return;
    }
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
