// Fantacalcio Highlights — app locale.
// Avvio: doppio clic su AVVIA.bat  (oppure: npm run app)
// Nessuna dipendenza esterna: usa solo Node. Il render passa dalla CLI di Remotion.

import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATI = join(ROOT, "dati");
const OUT = join(ROOT, "out");
const PUBLIC = join(ROOT, "public");
const UI = join(ROOT, "app", "ui");
const PORT = Number(process.env.PORT || 4321);
const SIMULA = process.env.FH_SIMULA === "1"; // solo per test: finge il render
const isWin = process.platform === "win32";
const HOST = process.env.HOST || "0.0.0.0";
// Modalità server (online): FH_SERVER=1 richiede una password (FH_PASSWORD) e nasconde le funzioni solo-Windows.
const SERVER = process.env.FH_SERVER === "1";
const PASSWORD = process.env.FH_PASSWORD || "";
if (SERVER && !PASSWORD) {
  console.error("\n  ✖ In modalità server serve una password: imposta FH_PASSWORD (vedi .env.example).\n");
  process.exit(1);
}

mkdirSync(DATI, { recursive: true });

/* ------------------------------------------------------------------ */
/* Impostazioni locali (restano solo su questo PC, in dati/impostazioni.json) */
/* ------------------------------------------------------------------ */
const FILE_IMPOSTAZIONI = join(DATI, "impostazioni.json");
const STILE_DEFAULT =
  "Telecronista sportivo italiano in diretta: entusiasta, ritmo veloce, molta energia, un filo ironico, come durante un gol decisivo.";
const VOCE_DEFAULT = { attiva: false, provider: "gemini", chiavi: {}, voce: { gemini: "Fenrir" }, stile: STILE_DEFAULT };
const leggiImpostazioni = () => {
  try {
    const x = JSON.parse(readFileSync(FILE_IMPOSTAZIONI, "utf8"));
    return { ...x, voce: { ...VOCE_DEFAULT, ...(x.voce || {}), chiavi: { ...(x.voce?.chiavi || {}) }, voce: { ...VOCE_DEFAULT.voce, ...(x.voce?.voce || {}) } } };
  } catch {
    return { voce: structuredClone(VOCE_DEFAULT) };
  }
};
const salvaImpostazioni = (x) => writeFileSync(FILE_IMPOSTAZIONI, JSON.stringify(x, null, 2));
const impostazioniPubbliche = () => {
  const { voce } = leggiImpostazioni();
  return {
    ambiente: { windows: isWin, server: SERVER },
    voce: {
      attiva: !!voce.attiva,
      provider: voce.provider,
      chiaviPresenti: { gemini: !!voce.chiavi.gemini, elevenlabs: !!voce.chiavi.elevenlabs },
      voce: voce.voce,
      stile: voce.stile,
    },
  };
};

/* ------------------------------------------------------------------ */
/* Telecronaca parlata: Google Gemini (gratis), voci di Windows (gratis, offline), ElevenLabs */
/* ------------------------------------------------------------------ */
const VOCE_DIR = join(ROOT, "public", "voce");
const ELEVEN = process.env.FH_ELEVEN_URL || "https://api.elevenlabs.io/v1"; // variabili solo per i test
const GEMINI = process.env.FH_GEMINI_URL || "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODELLI = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts"]; // il secondo è più leggero: serve da riserva
const bloccatoFino = {}; // modello -> ora fino a cui saltarlo (limite raggiunto)
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// Voci predefinite di Gemini: solo quelle MASCHILI (parlano tutte italiano), con il carattere indicato da Google
const VOCI_GEMINI = [
  ["Fenrir", "eccitabile, perfetta per la telecronaca"], ["Puck", "vivace"], ["Sadachbia", "brillante"], ["Orus", "decisa"],
  ["Algenib", "roca"], ["Charon", "informativa"], ["Alnilam", "decisa"], ["Rasalgethi", "informativa"], ["Iapetus", "chiara"],
  ["Achird", "amichevole"], ["Zubenelgenubi", "informale"], ["Sadaltager", "competente"], ["Umbriel", "rilassata"],
  ["Algieba", "morbida"], ["Schedar", "pacata"], ["Enceladus", "sussurrata"],
].map(([id, carattere]) => ({ id, nome: `${id} — ${carattere}` }));

const leggiErrore = async (r, chi) => {
  const t = await r.text().catch(() => "");
  if (r.status === 429) return new Error(`${chi}: limite gratuito raggiunto (429). ${t.slice(0, 200)}`);
  if (r.status === 401 || r.status === 403) return new Error(`${chi}: chiave non valida (${r.status}).`);
  return new Error(`${chi} ${r.status}: ${t.slice(0, 300)}`);
};

/** durata di un WAV leggendo l'intestazione */
const durataWav = (buf) => {
  let byteRate = 48000;
  let dati = buf.length - 44;
  for (let i = 12; i < buf.length - 8; ) {
    const id = buf.toString("ascii", i, i + 4);
    const size = buf.readUInt32LE(i + 4);
    if (id === "fmt ") byteRate = buf.readUInt32LE(i + 16);
    if (id === "data") {
      dati = Math.min(size, buf.length - i - 8);
      break;
    }
    i += 8 + size + (size % 2);
  }
  return dati / byteRate;
};

/** PCM 16 bit mono -> WAV */
const pcmToWav = (pcm, rate = 24000) => {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
};

// cerca nella risposta di Gemini il primo blocco audio (base64)
const trovaAudio = (x) => {
  if (!x || typeof x !== "object") return null;
  if ((x.type === "audio" || /audio/.test(x.mime_type || x.mimeType || "")) && typeof x.data === "string") return x;
  if (x.inlineData?.data) return { data: x.inlineData.data, mime_type: x.inlineData.mimeType };
  for (const v of Array.isArray(x) ? x : Object.values(x)) {
    const t = trovaAudio(v);
    if (t) return t;
  }
  return null;
};

const ttsGemini = async (testo, voce) => {
  if (!voce.chiavi.gemini) throw new Error("Manca la chiave Google AI Studio: inseriscila in Telecronaca parlata.");
  let ultimo;
  // prova il modello migliore, poi quello leggero; su limite/sovraccarico riprova con un po' di attesa
  for (const modello of GEMINI_MODELLI) {
    if ((bloccatoFino[modello] || 0) > Date.now() && modello !== GEMINI_MODELLI.at(-1)) continue;
    for (let tentativo = 0; tentativo < 3; tentativo++) {
      try {
        const r = await fetch(`${GEMINI}/interactions`, {
          method: "POST",
          headers: { "x-goog-api-key": voce.chiavi.gemini, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modello,
            input: [{ type: "user_input", content: [{ type: "text", text: testo, annotations: [{ type: "speech_metadata", style: voce.stile || STILE_DEFAULT }] }] }],
            response_format: { type: "audio" },
            generation_config: { speech_config: [{ voice: voce.voce.gemini || "Fenrir" }] },
          }),
        });
        if (!r.ok) {
          const e = await leggiErrore(r, `Gemini (${modello})`);
          console.error("[voce]", e.message);
          ultimo = e;
          if (r.status === 401 || r.status === 403) throw e; // la chiave non va: inutile riprovare
          if (r.status === 429 || r.status >= 500) {
            if (r.status === 429 && tentativo === 1) {
              bloccatoFino[modello] = Date.now() + 120000; // per 2 minuti usa direttamente l'altro modello
              break;
            }
            await pausa(3000 * (tentativo + 1));
            continue;
          }
          break; // errore sul modello (es. 400/404): passa al successivo
        }
        const audio = trovaAudio(await r.json());
        if (!audio) {
          ultimo = new Error(`Gemini (${modello}) non ha restituito audio.`);
          break;
        }
        const buf = Buffer.from(audio.data, "base64");
        return { buf: buf.toString("ascii", 0, 4) === "RIFF" ? buf : pcmToWav(buf), ext: "wav" };
      } catch (e) {
        if (/chiave non valida/.test(e.message)) throw e;
        ultimo = e;
        console.error("[voce]", e.message);
        await pausa(2000);
      }
    }
  }
  throw ultimo || new Error("Gemini non risponde.");
};

const ttsEleven = async (testo, voce) => {
  if (!voce.chiavi.elevenlabs) throw new Error("Manca la chiave ElevenLabs.");
  if (!voce.voce.elevenlabs) throw new Error("Scegli una voce ElevenLabs.");
  const r = await fetch(`${ELEVEN}/text-to-speech/${voce.voce.elevenlabs}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": voce.chiavi.elevenlabs, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: testo,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.35, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true },
    }),
  });
  if (!r.ok) throw await leggiErrore(r, "ElevenLabs");
  return { buf: Buffer.from(await r.arrayBuffer()), ext: "mp3" };
};

// Voci installate in Windows (System.Speech): testo e voce passano da variabili d'ambiente, niente problemi di virgolette
const powershell = (script, env = {}) =>
  new Promise((ok, ko) => {
    if (!isWin) return ko(new Error("Le voci di Windows funzionano solo su Windows."));
    const p = spawn("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], { env: { ...process.env, ...env } });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", ko);
    p.on("close", (c) => (c === 0 ? ok(out) : ko(new Error("Voce Windows: " + (err || out).slice(0, 300)))));
  });

const ttsWindows = async (testo, voce, file) => {
  await powershell(
    "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; " +
      "if ($env:FH_VOCE) { $s.SelectVoice($env:FH_VOCE) }; $s.Rate = 2; $s.SetOutputToWaveFile($env:FH_OUT); $s.Speak($env:FH_TESTO); $s.Dispose()",
    { FH_VOCE: voce.voce.windows || "", FH_OUT: file, FH_TESTO: testo },
  );
  return null; // il file è già scritto
};

const vociWindows = async () => {
  const out = await powershell(
    "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; " +
      "$s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name + '|' + $_.VoiceInfo.Culture.Name + '|' + $_.VoiceInfo.Gender }",
  );
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .map((r) => r.split("|"))
    // prima le voci italiane maschili
    .sort((a, b) => {
      const punti = (x) => ((x[1] || "").startsWith("it") ? 2 : 0) + (x[2] === "Male" ? 1 : 0);
      return punti(b) - punti(a);
    })
    .map(([nome, lingua, genere]) => ({ id: nome, nome: `${nome} — ${lingua}${genere ? ", " + (genere === "Male" ? "maschile" : genere === "Female" ? "femminile" : genere) : ""}` }));
};

const sintetizza = async (testo) => {
  const { voce } = leggiImpostazioni();
  const prov = voce.provider || "gemini";
  const nomeVoce = voce.voce[prov] || "";
  const ext = prov === "elevenlabs" ? "mp3" : "wav";
  mkdirSync(VOCE_DIR, { recursive: true });
  const id = createHash("sha1").update([prov, nomeVoce, prov === "gemini" ? voce.stile : "", testo].join("|")).digest("hex").slice(0, 16);
  const file = join(VOCE_DIR, `${id}.${ext}`);
  if (!existsSync(file)) {
    const r = prov === "elevenlabs" ? await ttsEleven(testo, voce) : prov === "windows" ? await ttsWindows(testo, voce, file) : await ttsGemini(testo, voce);
    if (r) writeFileSync(file, r.buf);
  }
  const buf = readFileSync(file);
  // mp3 di ElevenLabs a 128 kbps costanti; i WAV si leggono dall'intestazione
  const sec = ext === "mp3" ? (buf.length * 8) / 128000 : durataWav(buf);
  return { file: `voce/${id}.${ext}`, frames: Math.ceil(sec * 30) };
};

// Le frasi vengono dallo stesso codice del video (src/lib/frasi.ts), compilato al volo con esbuild
let frasiMod = null;
const caricaFrasi = async () => {
  const req = createRequire(join(ROOT, "package.json"));
  let esbuild;
  for (const nome of ["esbuild", "@remotion/bundler/node_modules/esbuild"]) {
    try {
      esbuild = req(nome);
      break;
    } catch {}
  }
  if (!esbuild) throw new Error("esbuild non trovato: lancia npm install nella cartella del progetto.");
  const outfile = join(OUT, "_frasi.mjs");
  esbuild.buildSync({ entryPoints: [join(ROOT, "src", "lib", "frasi.ts")], bundle: true, format: "esm", platform: "node", outfile, logLevel: "silent" });
  frasiMod = await import(pathToFileURL(outfile).href + "?t=" + Date.now());
  return frasiMod;
};
mkdirSync(OUT, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
};

const leggiLega = () => JSON.parse(readFileSync(join(ROOT, "src", "data", "lega.json"), "utf8"));
const fileGiornata = (n) => join(DATI, `giornata-${n}.json`);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ------------------------------------------------------------------ */
/* Coda di render                                                       */
/* ------------------------------------------------------------------ */

const jobs = []; // { id, giornata, passi:[{tipo, scontro, nome, file, stato, progresso, errore}], stato, creato }
let inCorso = false;
let processoAttivo = null;

const nomeFile = (g, i, tipo) => {
  const s = g.scontri[i];
  const base = `${i + 1}-${slug(s.casa)}-vs-${slug(s.trasferta)}`;
  return tipo === "video" ? `highlight-${base}.mp4` : `${tipo}-${base}.png`;
};

const creaJob = (g, scontri, tipi) => {
  const cartella = join(OUT, `giornata-${g.giornata}`);
  mkdirSync(cartella, { recursive: true });
  const propsFile = join(cartella, "_props.json");
  writeFileSync(propsFile, JSON.stringify({ giornata: g }));
  const passi = [];
  if (tipi.includes("video") && leggiImpostazioni().voce?.attiva) {
    passi.push({ tipo: "voce", scontri, nome: "Telecronaca (voce)", stato: "in coda", progresso: 0 });
  }
  for (const i of scontri) {
    for (const tipo of tipi) {
      const file = nomeFile(g, i, tipo);
      passi.push({
        tipo,
        scontro: i,
        nome: `${tipo === "video" ? "Video" : tipo === "locandina" ? "Locandina" : "Presentazione"} ${i + 1}`,
        composizione: `${tipo === "video" ? "Highlight" : tipo === "locandina" ? "Locandina" : "Presentazione"}-${i + 1}`,
        file,
        url: `/out/giornata-${g.giornata}/${file}`,
        percorso: join(cartella, file),
        stato: "in coda",
        progresso: 0,
      });
    }
  }
  const job = { id: Date.now().toString(36), giornata: g.giornata, propsFile, passi, stato: "in coda", creato: Date.now() };
  jobs.unshift(job);
  if (jobs.length > 20) jobs.length = 20;
  setImmediate(prossimo);
  return job;
};

const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

/** Sposta il file appena renderizzato al suo posto. Se il vecchio è bloccato (aperto in un player,
 *  in anteprima in Esplora risorse, ecc.) riprova; se resta bloccato salva con un nome nuovo. */
const sostituisci = async (p) => {
  for (let i = 0; i < 8; i++) {
    try {
      if (existsSync(p.percorso)) unlinkSync(p.percorso);
      renameSync(p.temporaneo, p.percorso);
      return;
    } catch {
      await attesa(500);
    }
  }
  const ext = extname(p.file);
  const alt = p.file.replace(ext, `-${new Date().toTimeString().slice(0, 8).replace(/:/g, "")}${ext}`);
  renameSync(p.temporaneo, join(dirname(p.percorso), alt));
  p.avviso = `Il file precedente era aperto in un altro programma: salvato come ${alt}`;
  p.file = alt;
  p.url = p.url.replace(/[^/]+$/, alt);
};

const q = (s) => (isWin ? `"${s}"` : `'${s.replace(/'/g, "'\\''")}'`);

const eseguiPasso = (job, p) =>
  new Promise((ok) => {
    p.stato = "in corso";
    if (p.tipo === "voce") {
      (async () => {
        try {
          const { frasiGiornata } = await caricaFrasi();
          const g = JSON.parse(readFileSync(job.propsFile, "utf8")).giornata;
          const tutte = frasiGiornata(g);
          const voci = {};
          let fatte = 0;
          const totale = p.scontri.length * 3;
          for (const i of p.scontri) {
            voci[String(i)] = {};
            for (const k of ["pre", "mvp", "verdetto"]) {
              voci[String(i)][k] = await sintetizza(tutte[i][k]);
              p.progresso = ++fatte / totale;
            }
          }
          writeFileSync(job.propsFile, JSON.stringify({ giornata: g, voci }));
          p.stato = "fatto";
        } catch (e) {
          p.stato = "errore";
          p.errore = String(e.message || e) + "\n(I video verranno generati senza voce.)";
        }
        ok();
      })();
      return;
    }
    if (SIMULA) {
      let k = 0;
      const t = setInterval(() => {
        k += p.tipo === "video" ? 0.1 : 0.5;
        p.progresso = Math.min(1, k);
        if (k >= 1) {
          clearInterval(t);
          const finto = join(ROOT, "app", "ui", p.tipo === "video" ? "_finto.mp4" : "_finto.png");
          if (existsSync(finto)) writeFileSync(p.percorso, readFileSync(finto));
          p.stato = "fatto";
          ok();
        }
      }, 120);
      return;
    }
    const tmpDir = join(dirname(p.percorso), "_tmp");
    mkdirSync(tmpDir, { recursive: true });
    p.temporaneo = join(tmpDir, `${Date.now().toString(36)}-${p.file}`);
    const cmd = [
      "npx",
      "remotion",
      p.tipo === "video" ? "render" : "still",
      p.composizione,
      q(p.temporaneo),
      `--props=${q(job.propsFile)}`,
    ].join(" ");
    const child = spawn(cmd, { cwd: ROOT, shell: true, env: { ...process.env, FORCE_COLOR: "0", CI: "1" } });
    processoAttivo = child;
    let coda = "";
    const leggi = (buf) => {
      const txt = buf.toString();
      coda = (coda + txt).slice(-4000);
      // Remotion stampa "Rendered 123/914" ed "Encoded 123/914"
      const m = [...txt.matchAll(/(Rendered|Encoded|Rendering frames?)\D*?(\d+)\s*\/\s*(\d+)/gi)].pop();
      if (m) {
        const v = Number(m[2]) / Number(m[3]);
        const peso = /encod/i.test(m[1]) ? 0.85 + v * 0.15 : v * 0.85;
        p.progresso = Math.max(p.progresso, Math.min(0.99, peso));
      }
    };
    child.stdout.on("data", leggi);
    child.stderr.on("data", leggi);
    child.on("close", (code) => {
      processoAttivo = null;
      if (code === 0 && existsSync(p.temporaneo)) {
        sostituisci(p).then(() => {
          p.stato = "fatto";
          p.progresso = 1;
          ok();
        });
        return;
      } else {
        p.stato = "errore";
        p.errore = coda.split("\n").filter(Boolean).slice(-12).join("\n") || `uscita con codice ${code}`;
      }
      ok();
    });
  });

async function prossimo() {
  if (inCorso) return;
  const job = [...jobs].reverse().find((j) => j.stato === "in coda");
  if (!job) return;
  inCorso = true;
  job.stato = "in corso";
  for (const p of job.passi) {
    if (job.stato === "annullato") break;
    await eseguiPasso(job, p);
  }
  if (job.stato !== "annullato") job.stato = job.passi.some((p) => p.stato === "errore") ? "con errori" : "fatto";
  inCorso = false;
  prossimo();
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                 */
/* ------------------------------------------------------------------ */

const json = (res, code, data) => {
  res.writeHead(code, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};

const corpo = (req) =>
  new Promise((ok, ko) => {
    let b = "";
    req.on("data", (c) => {
      b += c;
      if (b.length > 5e6) ko(new Error("troppo grande"));
    });
    req.on("end", () => {
      try {
        ok(b ? JSON.parse(b) : {});
      } catch (e) {
        ko(e);
      }
    });
  });

const servi = (req, res, base, rel) => {
  const p = normalize(join(base, decodeURIComponent(rel)));
  if (!p.startsWith(base + sep) && p !== base) return json(res, 403, { errore: "vietato" });
  if (!existsSync(p) || !statSync(p).isFile()) return json(res, 404, { errore: "non trovato" });
  // Il file viene letto tutto in memoria e chiuso subito: su Windows un file lasciato aperto
  // (es. un video in anteprima nella galleria) non potrebbe essere sovrascritto dal render successivo.
  const buf = readFileSync(p);
  const size = buf.length;
  const type = MIME[extname(p).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;
  if (range) {
    const [a, b] = range.replace("bytes=", "").split("-");
    const start = Math.min(Number(a) || 0, size - 1);
    const end = Math.min(b ? Number(b) : size - 1, size - 1);
    res.writeHead(206, {
      "Content-Type": type,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Cache-Control": "no-store",
    });
    res.end(buf.subarray(start, end + 1));
  } else {
    res.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes", "Cache-Control": "no-store" });
    res.end(buf);
  }
};

const valida = (g) => {
  const errori = [];
  if (!Number.isInteger(g.giornata) || g.giornata < 1) errori.push("Numero giornata non valido");
  if (!Array.isArray(g.scontri) || g.scontri.length === 0) errori.push("Nessuno scontro");
  const lega = leggiLega();
  const ids = new Set(lega.squadre.map((s) => s.id));
  const usate = new Set();
  (g.scontri || []).forEach((s, i) => {
    for (const lato of ["casa", "trasferta"]) {
      if (!ids.has(s[lato])) errori.push(`Scontro ${i + 1}: squadra ${lato} mancante`);
      else if (usate.has(s[lato])) errori.push(`Scontro ${i + 1}: ${s[lato]} gioca già in un altro scontro`);
      usate.add(s[lato]);
    }
    for (const k of ["punteggioCasa", "punteggioTrasferta"])
      if (typeof s[k] !== "number" || Number.isNaN(s[k])) errori.push(`Scontro ${i + 1}: manca il punteggio`);
  });
  return errori;
};

/* ------------------------------------------------------------------ */
/* Password (solo se FH_PASSWORD è impostata): cookie firmato, nessuna dipendenza */
/* ------------------------------------------------------------------ */
const TOKEN = PASSWORD ? createHmac("sha256", PASSWORD).update("fh-sessione-v1").digest("hex") : "";
const uguali = (a, b) => {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && timingSafeEqual(A, B);
};
const cookieOk = (req) => {
  const m = (req.headers.cookie || "").match(/(?:^|;\s*)fh=([a-f0-9]+)/);
  return !!m && uguali(m[1], TOKEN);
};
let falliti = 0, bloccoFinoA = 0;
const PAGINA_LOGIN = (err) => `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fanta Highlights</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07080f;color:#f4f5fb;font-family:Inter,"Segoe UI",system-ui,sans-serif}
form{background:#121629;border:1px solid #262c4a;border-radius:14px;padding:28px;width:min(340px,88vw);display:grid;gap:14px}
h1{margin:0;font-style:italic;font-weight:900;font-size:22px}p{margin:0;color:#8d94b0;font-size:14px}
input{background:#0e1120;border:1px solid #262c4a;border-radius:9px;padding:12px;color:inherit;font:inherit;font-size:16px}
button{border:0;border-radius:10px;padding:12px;font-weight:800;background:#c6ff2e;color:#0a0c16;font-size:16px;cursor:pointer}.e{color:#ff3346;font-size:14px}</style>
<form method="post" action="/login"><h1>⚽ FANTA HIGHLIGHTS</h1><p>Ciempions Fig · accesso riservato</p>
<input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password">
${err ? `<div class="e">${err}</div>` : ""}<button>Entra</button></form></html>`;
const corpoForm = (req) =>
  new Promise((ok) => {
    let b = "";
    req.on("data", (c) => (b = (b + c).slice(0, 2000)));
    req.on("end", () => ok(new URLSearchParams(b)));
  });
const html = (res, code, txt, extra = {}) => {
  res.writeHead(code, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...extra });
  res.end(txt);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  try {
    if (path === "/healthz") return json(res, 200, { ok: true });
    if (PASSWORD) {
      if (path === "/login" && req.method === "POST") {
        if (Date.now() < bloccoFinoA) return html(res, 429, PAGINA_LOGIN("Troppi tentativi: riprova tra un minuto."));
        const pw = (await corpoForm(req)).get("password") || "";
        if (uguali(createHmac("sha256", "x").update(pw).digest("hex"), createHmac("sha256", "x").update(PASSWORD).digest("hex"))) {
          falliti = 0;
          const sicuro = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
          return html(res, 302, "", { Location: "/", "Set-Cookie": `fh=${TOKEN}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${sicuro}` });
        }
        if (++falliti >= 5) { bloccoFinoA = Date.now() + 60000; falliti = 0; }
        return html(res, 401, PAGINA_LOGIN("Password sbagliata."));
      }
      if (path === "/login") return html(res, 200, PAGINA_LOGIN(""));
      if (path === "/logout") return html(res, 302, "", { Location: "/login", "Set-Cookie": "fh=; Max-Age=0; Path=/" });
      if (!cookieOk(req)) {
        if (path.startsWith("/api/")) return json(res, 401, { errore: "Accesso richiesto: ricarica la pagina." });
        return html(res, 302, "", { Location: "/login" });
      }
    }
    if (req.method === "GET" && (path === "/" || path === "/index.html")) return servi(req, res, UI, "index.html");
    if (req.method === "GET" && path.startsWith("/ui/")) return servi(req, res, UI, path.slice(4));
    if (req.method === "GET" && path.startsWith("/out/")) return servi(req, res, OUT, path.slice(5));
    if (req.method === "GET" && path.startsWith("/public/")) return servi(req, res, PUBLIC, path.slice(8));

    if (req.method === "GET" && path === "/api/lega") return json(res, 200, leggiLega());

    if (req.method === "GET" && path === "/api/impostazioni") return json(res, 200, impostazioniPubbliche());
    if (req.method === "POST" && path === "/api/impostazioni") {
      const b = (await corpo(req)).voce || {};
      const cur = leggiImpostazioni();
      const voce = cur.voce;
      if (typeof b.attiva === "boolean") voce.attiva = b.attiva;
      if (["gemini", "windows", "elevenlabs"].includes(b.provider)) voce.provider = b.provider;
      if (b.chiave && typeof b.chiave.valore === "string" && b.chiave.valore.trim()) voce.chiavi[b.chiave.provider] = b.chiave.valore.trim();
      if (b.voce && typeof b.voce.id === "string") voce.voce[b.voce.provider] = b.voce.id;
      if (typeof b.stile === "string") voce.stile = b.stile.trim() || STILE_DEFAULT;
      salvaImpostazioni({ ...cur, voce });
      return json(res, 200, impostazioniPubbliche());
    }
    if (req.method === "GET" && path === "/api/voci") {
      const prov = url.searchParams.get("provider") || leggiImpostazioni().voce.provider;
      if (prov === "gemini") return json(res, 200, VOCI_GEMINI);
      if (prov === "windows") return json(res, 200, await vociWindows());
      const { voce } = leggiImpostazioni();
      if (!voce.chiavi.elevenlabs) throw new Error("Manca la chiave ElevenLabs.");
      const r = await fetch(`${ELEVEN}/voices`, { headers: { "xi-api-key": voce.chiavi.elevenlabs } });
      if (!r.ok) throw await leggiErrore(r, "ElevenLabs");
      const d = await r.json();
      return json(res, 200, (d.voices || []).map((v) => ({ id: v.voice_id, nome: `${v.name}${v.category === "cloned" ? " (clonata)" : ""}` })));
    }
    if (req.method === "POST" && path === "/api/prova-voce") {
      const b = await corpo(req);
      const v = await sintetizza(String(b.testo || "Gooool! Che partita, signori! La Ciempions Fig non delude mai.").slice(0, 300));
      return json(res, 200, { url: "/public/" + v.file, frames: v.frames });
    }

    if (req.method === "GET" && path === "/api/giornate") {
      const elenco = readdirSync(DATI)
        .map((f) => f.match(/^giornata-(\d+)\.json$/))
        .filter(Boolean)
        .map((m) => Number(m[1]))
        .sort((a, b) => b - a)
        .map((n) => {
          const cartella = join(OUT, `giornata-${n}`);
          const file = existsSync(cartella) ? readdirSync(cartella).filter((f) => !f.startsWith("_")) : [];
          return { numero: n, file: file.map((f) => ({ nome: f, url: `/out/giornata-${n}/${f}` })) };
        });
      return json(res, 200, elenco);
    }

    const mG = path.match(/^\/api\/giornata\/(\d+)$/);
    if (req.method === "GET" && mG) {
      const f = fileGiornata(mG[1]);
      if (!existsSync(f)) return json(res, 404, { errore: "Giornata non salvata" });
      return json(res, 200, JSON.parse(readFileSync(f, "utf8")));
    }

    if (req.method === "POST" && path === "/api/giornata") {
      const g = await corpo(req);
      const errori = valida(g);
      if (errori.length) return json(res, 400, { errori });
      writeFileSync(fileGiornata(g.giornata), JSON.stringify(g, null, 2));
      return json(res, 200, { ok: true });
    }

    if (req.method === "POST" && path === "/api/genera") {
      const { giornata: g, scontri, tipi } = await corpo(req);
      const errori = valida(g);
      if (errori.length) return json(res, 400, { errori });
      writeFileSync(fileGiornata(g.giornata), JSON.stringify(g, null, 2));
      const idx = Array.isArray(scontri) && scontri.length ? scontri : g.scontri.map((_, i) => i);
      const t = Array.isArray(tipi) && tipi.length ? tipi : ["locandina", "presentazione", "video"];
      const job = creaJob(g, idx, t);
      return json(res, 200, { id: job.id });
    }

    if (req.method === "GET" && path === "/api/lavori") {
      return json(
        res,
        200,
        jobs.map(({ propsFile, passi, ...j }) => ({ ...j, passi: passi.map(({ percorso, ...p }) => p) })),
      );
    }

    if (req.method === "POST" && path === "/api/annulla") {
      for (const j of jobs) if (j.stato === "in coda" || j.stato === "in corso") j.stato = "annullato";
      if (processoAttivo) processoAttivo.kill();
      return json(res, 200, { ok: true });
    }

    const mA = path.match(/^\/api\/apri-cartella\/(\d+)$/);
    if (req.method === "POST" && mA) {
      if (SERVER) return json(res, 200, { ok: true });
      const cartella = join(OUT, `giornata-${mA[1]}`);
      mkdirSync(cartella, { recursive: true });
      spawn(isWin ? "explorer" : "xdg-open", [cartella], { detached: true, stdio: "ignore" }).on("error", () => {}).unref();
      return json(res, 200, { ok: true });
    }

    json(res, 404, { errore: "non trovato" });
  } catch (e) {
    json(res, 500, { errore: String(e.message || e) });
  }
});

server.listen(PORT, HOST, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  ⚽ Fantacalcio Highlights è pronto: ${url}\n  (chiudi questa finestra per spegnere l'app)\n`);
  if (process.argv.includes("--apri")) {
    const c = isWin ? spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }) : spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
    c.on("error", () => {});
    c.unref();
  }
});
