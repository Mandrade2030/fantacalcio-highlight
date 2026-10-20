// Pannello "Bot WhatsApp": collegamento con QR, gruppo e chat di prova, messaggi pre/fine giornata, invio libero.
(() => {
  const $ = (s) => document.querySelector(s);
  const api = async (u, o) => {
    const r = await fetch(u, o);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.errore || `Errore ${r.status}`);
    return j;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const nota = (t, err) => {
    $("#waErr").textContent = t || "";
    $("#waErr").style.color = err ? "#ff6b6b" : "";
  };
  let caricati = false;
  let salvati = { gruppo: null, prova: null };

  const opzioni = (lista, scelto, vuoto) =>
    `<option value="">${vuoto}</option>` +
    lista
      .map((x) => `<option value="${esc(x.id)}" ${x.id === scelto ? "selected" : ""}>${x.privata ? "👤 " : "👥 "}${esc(x.nome)}${x.privata ? "" : ` (${x.membri})`}</option>`)
      .join("");

  const aggiorna = async () => {
    try {
      const s = await api("/api/whatsapp");
      salvati = { gruppo: s.gruppo, prova: s.prova };
      $("#waStato").textContent = s.connesso ? `collegato${s.numero ? " · +" + s.numero : ""}` : s.stato;
      $("#waQr").hidden = !s.qr;
      if (s.qr) $("#waQrImg").src = s.qr;
      $("#waOk").hidden = !s.connesso;
      if (!s.connesso && s.errore && !s.qr) nota(s.errore, true);
      if (s.connesso && !caricati) {
        caricati = true;
        const g = await api("/api/whatsapp/gruppi");
        // il gruppo può essere anche una chat (per chi vuole), ma di solito è un gruppo; le prove di solito una chat privata
        $("#waGruppo").innerHTML = opzioni([...g.filter((x) => !x.privata), ...g.filter((x) => x.privata)], salvati.gruppo, "Scegli il gruppo…");
        $("#waProva").innerHTML = opzioni([...g.filter((x) => x.privata), ...g.filter((x) => !x.privata)], salvati.prova, "Scegli la tua chat…");
        if (!g.some((x) => !x.privata)) nota("Il bot non è in nessun gruppo: aggiungi il suo numero al gruppo della lega.");
      }
      if (!s.connesso) caricati = false;
    } catch (e) {
      $("#waStato").textContent = "non disponibile";
      nota(e.message, true);
    }
  };

  const salva = (campo) => async (e) => {
    await api("/api/whatsapp/gruppo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campo, gruppo: e.target.value }) });
    salvati[campo] = e.target.value;
    nota(campo === "prova" ? "Chat di prova salvata." : "Gruppo salvato.");
  };
  $("#waGruppo").addEventListener("change", salva("gruppo"));
  $("#waProva").addEventListener("change", salva("prova"));
  $("#waRicarica").addEventListener("click", () => {
    caricati = false;
    aggiorna();
  });

  // numeri di giornata di partenza: prossima da presentare / ultima giocata
  api("/api/pregiornata")
    .then((x) => {
      $("#waPreNum").value = x.prossima;
      $("#waFineNum").value = Math.max(1, x.prossima - 1);
    })
    .catch(() => {});
  const num = (tipo) => +$(tipo === "pre" ? "#waPreNum" : "#waFineNum").value || 1;

  document.querySelectorAll(".wa-vedi").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        const m = await api(`/api/whatsapp/messaggi/${b.dataset.tipo}/${num(b.dataset.tipo)}`);
        $("#waAnteprima").hidden = false;
        $("#waAnteprima").textContent = m.map((x) => (x.file ? `${x.file.endsWith(".mp4") ? "🎬" : "🖼"} [${x.file.split("/").pop()}]\n` : "") + x.testo).join("\n\n— — —\n\n");
        nota("");
      } catch (e) {
        nota(e.message, true);
      }
    }),
  );
  document.querySelectorAll(".wa-manda").forEach((b) =>
    b.addEventListener("click", async () => {
      const a = b.dataset.a;
      const tipo = b.dataset.tipo;
      if (!salvati[a]) return nota(a === "gruppo" ? "Prima scegli il gruppo." : "Prima scegli la tua chat di prova.", true);
      const dove = $(a === "gruppo" ? "#waGruppo" : "#waProva").selectedOptions[0]?.textContent || "";
      if (a === "gruppo" && !confirm(`Mandare i messaggi ${tipo === "pre" ? "pre-giornata" : "di fine giornata"} (giornata ${num(tipo)}) a ${dove}?`)) return;
      document.querySelectorAll(".wa-manda").forEach((x) => (x.disabled = true));
      try {
        const r = await api("/api/whatsapp/messaggi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, giornata: num(tipo), a }) });
        if (r.gia === "fatto" && !confirm(`Questi messaggi sono già stati mandati a ${dove} pochi minuti fa. Rimandarli?`)) {
          nota("Non rimandati.");
        } else {
          if (r.gia === "fatto") await api("/api/whatsapp/messaggi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, giornata: num(tipo), a, ripeti: true }) });
          await segui(r.chiave, dove);
        }
      } catch (e) {
        nota(e.message, true);
      } finally {
        document.querySelectorAll(".wa-manda").forEach((x) => (x.disabled = false));
      }
    }),
  );

  // segue l'invio che gira sul server (anche se la pagina si chiude, il server continua da solo)
  const segui = async (chiave, dove) => {
    $("#waFerma").hidden = false;
    for (let i = 0; i < 400; i++) {
      const lista = await api("/api/whatsapp/invii").catch(() => []);
      const inv = lista.find((x) => x.chiave === chiave);
      if (!inv) break;
      if (inv.stato === "in corso") nota(`Il bot sta scrivendo a ${dove}… ${inv.fatti}/${inv.totale}`);
      else {
        nota(inv.stato === "fatto" ? `Mandati ${inv.totale} messaggi a ${dove} ✔${inv.avviso ? " ⚠️ " + inv.avviso : ""}` : inv.stato === "annullato" ? `Invio fermato dopo ${inv.fatti}/${inv.totale}.` : `Errore: ${inv.errore}`, inv.stato === "errore");
        break;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    $("#waFerma").hidden = true;
  };
  $("#waFerma").addEventListener("click", async () => {
    await api("/api/whatsapp/annulla", { method: "POST" });
    nota("Fermo l'invio dopo il messaggio in corso…");
  });

  $("#waEsci").addEventListener("click", async () => {
    if (!confirm("Scollegare il bot da WhatsApp? Dovrai riscansionare il QR.")) return;
    await api("/api/whatsapp/esci", { method: "POST" });
    setTimeout(aggiorna, 1500);
  });
  $("#waInvia").addEventListener("click", async () => {
    const f = $("#waFile").files[0];
    const testo = $("#waTesto").value;
    const b = $("#waInvia");
    b.disabled = true;
    nota("Invio in corso…");
    try {
      if (f) {
        await api(`/api/whatsapp/invia?testo=${encodeURIComponent(testo)}`, { method: "POST", headers: { "Content-Type": f.type || "application/octet-stream" }, body: f });
      } else {
        await api("/api/whatsapp/invia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testo }) });
      }
      nota("Mandato ✔");
      $("#waFile").value = "";
    } catch (e) {
      nota(e.message, true);
    } finally {
      b.disabled = false;
    }
  });
  document.addEventListener("click", async (e) => {
    const b = e.target.closest(".wa-send");
    if (!b) return;
    if (!salvati.gruppo) {
      $("#boxWa").open = true;
      return nota("Prima collega il bot e scegli il gruppo.", true);
    }
    if (!confirm(`Mandare ${b.dataset.file.split("/").pop()} nel gruppo?`)) return;
    b.disabled = true;
    try {
      await api("/api/whatsapp/invia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ file: b.dataset.file, testo: $("#waTesto").value }) });
      b.textContent = "✔";
    } catch (err) {
      alert(err.message);
      b.disabled = false;
    }
  });

  aggiorna();
  setInterval(aggiorna, 4000);
})();
