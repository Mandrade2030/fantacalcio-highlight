// Pannello "Bot WhatsApp": collegamento con QR, scelta del gruppo, invio di file e messaggi.
(() => {
  const $ = (s) => document.querySelector(s);
  const api = async (u, o) => {
    const r = await fetch(u, o);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.errore || `Errore ${r.status}`);
    return j;
  };
  const nota = (t, err) => {
    $("#waErr").textContent = t || "";
    $("#waErr").style.color = err ? "#ff6b6b" : "";
  };
  let gruppiCaricati = false;
  let gruppoSalvato = null;

  const aggiorna = async () => {
    try {
      const s = await api("/api/whatsapp");
      gruppoSalvato = s.gruppo;
      $("#waStato").textContent = s.connesso ? `collegato${s.numero ? " · +" + s.numero : ""}` : s.stato;
      $("#waQr").hidden = !s.qr;
      if (s.qr) $("#waQrImg").src = s.qr;
      $("#waOk").hidden = !s.connesso;
      if (!s.connesso && s.errore && !s.qr) nota(s.errore, true);
      if (s.connesso && !gruppiCaricati) {
        gruppiCaricati = true;
        const g = await api("/api/whatsapp/gruppi");
        $("#waGruppo").innerHTML =
          `<option value="">Scegli il gruppo…</option>` +
          g.map((x) => `<option value="${x.id}" ${x.id === gruppoSalvato ? "selected" : ""}>${x.nome.replace(/</g, "&lt;")} (${x.membri})</option>`).join("");
        if (!g.length) nota("Il bot non è in nessun gruppo: aggiungi il suo numero al gruppo della lega.");
      }
      if (!s.connesso) gruppiCaricati = false;
    } catch (e) {
      $("#waStato").textContent = "non disponibile";
      nota(e.message, true);
    }
  };

  $("#waGruppo").addEventListener("change", async (e) => {
    await api("/api/whatsapp/gruppo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gruppo: e.target.value }) });
    gruppoSalvato = e.target.value;
    nota("Gruppo salvato.");
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
      nota("Mandato nel gruppo ✔");
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
    if (!gruppoSalvato) {
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
