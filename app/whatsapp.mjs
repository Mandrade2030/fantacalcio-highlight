// Bot WhatsApp: si collega come "dispositivo collegato" (tipo WhatsApp Web) con la libreria Baileys.
// La sessione resta salvata in dati/whatsapp/ (così non serve riscansionare il QR a ogni riavvio).
// Uso NON ufficiale: WhatsApp può bloccare il numero. Usare un numero dedicato al bot.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let stato = { connesso: false, stato: "spento", qr: null, numero: null, errore: null };
let sock = null;
let avvio = null;
let cartella = null;
let gruppiCache = { t: 0, lista: [] };
// chat private viste dal bot (chi gli ha scritto): così si possono scegliere come destinazione, es. per le prove
let chatPrivate = {};
const fileChat = () => join(cartella, "..", "whatsapp-chat.json");
const caricaChat = () => {
  try {
    if (existsSync(fileChat())) chatPrivate = JSON.parse(readFileSync(fileChat(), "utf8"));
  } catch {}
};
const privata = (jid) => /@(s\.whatsapp\.net|lid)$/.test(jid || "");
/** "+39 333 1234567" -> "393331234567@s.whatsapp.net"; i jid già pronti restano uguali */
const jidDa = (dest) => {
  const d = String(dest || "").trim();
  if (/@(g\.us|s\.whatsapp\.net|lid)$/.test(d)) return d;
  const num = d.replace(/[^0-9]/g, "");
  return num.length >= 8 ? `${num}@s.whatsapp.net` : null;
};
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

const carica = async () => {
  const B = await import("@whiskeysockets/baileys");
  const make = B.makeWASocket || B.default?.default || B.default;
  let logger;
  try {
    const pino = (await import("pino")).default;
    logger = pino({ level: "silent" });
  } catch {}
  return { B, make, logger };
};

const qrDataUrl = async (testo) => {
  try {
    const QR = (await import("qrcode")).default;
    return await QR.toDataURL(testo, { margin: 1, width: 360 });
  } catch {
    return null;
  }
};

const connetti = async () => {
  const { B, make, logger } = await carica();
  const { state, saveCreds } = await B.useMultiFileAuthState(cartella);
  let version;
  try {
    version = (await B.fetchLatestBaileysVersion()).version;
  } catch {}
  stato = { ...stato, stato: "connessione…", errore: null };
  sock = make({
    auth: state,
    version,
    logger,
    printQRInTerminal: false,
    browser: ["Fantacalcio Highlights", "Chrome", "1.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("messages.upsert", ({ messages }) => {
    let nuove = false;
    for (const m of messages || []) {
      const jid = m.key?.remoteJid;
      if (!privata(jid) || m.key?.fromMe) continue;
      const nome = m.pushName || chatPrivate[jid]?.nome || jid.split("@")[0];
      if (chatPrivate[jid]?.nome !== nome) nuove = true;
      chatPrivate[jid] = { nome, visto: Date.now() };
    }
    if (nuove) {
      try {
        writeFileSync(fileChat(), JSON.stringify(chatPrivate, null, 2));
      } catch {}
    }
  });
  sock.ev.on("connection.update", async (u) => {
    if (u.qr) stato = { ...stato, stato: "da collegare", qr: await qrDataUrl(u.qr), connesso: false };
    if (u.connection === "open") {
      stato = { connesso: true, stato: "collegato", qr: null, numero: sock.user?.id?.split(":")[0] || null, errore: null };
    }
    if (u.connection === "close") {
      const codice = u.lastDisconnect?.error?.output?.statusCode;
      const uscito = codice === B.DisconnectReason?.loggedOut;
      stato = { ...stato, connesso: false, qr: null, stato: uscito ? "scollegato" : "riconnessione…", errore: u.lastDisconnect?.error?.message || null };
      sock = null;
      if (uscito) {
        rmSync(cartella, { recursive: true, force: true });
        mkdirSync(cartella, { recursive: true });
      }
      setTimeout(() => connetti().catch((e) => (stato = { ...stato, stato: "errore", errore: e.message })), uscito ? 1500 : 4000);
    }
  });
};

/** Avvia il bot (una volta sola). dir = cartella dati del progetto */
export const avviaWhatsApp = (dirDati) => {
  if (avvio) return avvio;
  cartella = join(dirDati, "whatsapp");
  mkdirSync(cartella, { recursive: true });
  caricaChat();
  avvio = connetti().catch((e) => {
    stato = { ...stato, stato: "non disponibile", errore: e.message.includes("Cannot find") ? "Libreria non installata: lancia npm install." : e.message };
    avvio = null;
  });
  return avvio;
};

export const statoWhatsApp = () => stato;

export const esciWhatsApp = async () => {
  try {
    await sock?.logout();
  } catch {}
};

export const gruppiWhatsApp = async () => {
  if (!sock || !stato.connesso) throw new Error("Il bot WhatsApp non è collegato.");
  if (Date.now() - gruppiCache.t > 60000) {
    const g = await sock.groupFetchAllParticipating();
    gruppiCache = {
      t: Date.now(),
      lista: Object.values(g)
        .map((x) => ({ id: x.id, nome: x.subject, membri: x.participants?.length || 0 }))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    };
  }
  const priv = Object.entries(chatPrivate)
    .sort((a, b) => b[1].visto - a[1].visto)
    .map(([id, c]) => ({ id, nome: c.nome, privata: true }));
  return [...gruppiCache.lista, ...priv];
};

/** Manda testo, immagine o video a un gruppo (jid ...@g.us) o a una chat privata (jid o numero) */
export const inviaWhatsApp = async ({ gruppo, testo = "", buffer = null, tipo = null, scrive = 0, miniatura = null }) => {
  if (!sock || !stato.connesso) throw new Error("Il bot WhatsApp non è collegato.");
  const jid = jidDa(gruppo);
  if (!jid) throw new Error("Scegli il gruppo (o la chat) a cui mandare.");
  gruppo = jid;
  if (scrive) {
    // "sta scrivendo…" prima del messaggio: più naturale (e meno da robot) per WhatsApp
    try {
      await sock.sendPresenceUpdate("composing", jid);
      await attesa(scrive);
      await sock.sendPresenceUpdate("paused", jid);
    } catch {}
  }
  let msg;
  if (buffer && tipo?.startsWith("image/")) msg = { image: buffer, caption: testo, mimetype: tipo };
  else if (buffer && tipo?.startsWith("video/")) {
    // con la miniatura WhatsApp mostra subito l'anteprima del video (senza resta un riquadro sfocato)
    msg = { video: buffer, caption: testo, mimetype: "video/mp4", width: 1080, height: 1920 };
    if (miniatura) msg.jpegThumbnail = miniatura;
  }
  else if (testo.trim()) msg = { text: testo };
  else throw new Error("Niente da mandare.");
  await sock.sendMessage(gruppo, msg);
  return true;
};
