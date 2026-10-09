// Prova veloce del bot WhatsApp (senza toccare la sessione vera): avvia, aspetta, stampa lo stato.
import { avviaWhatsApp, statoWhatsApp } from "../app/whatsapp.mjs";
avviaWhatsApp("/tmp/prova-wa");
await new Promise((r) => setTimeout(r, 15000));
const s = statoWhatsApp();
console.log("STATO:", s.stato, "| QR pronto:", !!s.qr, "| errore:", s.errore);
process.exit(0);
