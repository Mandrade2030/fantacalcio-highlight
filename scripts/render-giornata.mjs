// Renderizza tutti gli highlight e le locandine di una giornata.
//
//   npm run render:giornata                       -> usa src/data/giornata.json
//   npm run render:giornata -- dati/g8.json       -> usa un altro file
//
// Output in out/giornata-<N>/

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(process.argv[2] ?? "src/data/giornata.json");
if (!existsSync(file)) {
  console.error(`File dati non trovato: ${file}`);
  process.exit(1);
}
const giornata = JSON.parse(readFileSync(file, "utf8"));
const out = resolve(`out/giornata-${giornata.giornata}`);
mkdirSync(out, { recursive: true });

// Le props passano da file: evita i limiti di lunghezza della riga di comando su Windows
const propsFile = resolve(out, "_props.json");
writeFileSync(propsFile, JSON.stringify({ giornata }));

const isWin = process.platform === "win32";
const run = (args) =>
  execFileSync(isWin ? "npx.cmd" : "npx", ["remotion", ...args, `--props=${propsFile}`], {
    stdio: "inherit",
    shell: isWin,
  });

giornata.scontri.forEach((s, i) => {
  const n = i + 1;
  const nome = `${n}-${s.casa}-vs-${s.trasferta}`;
  console.log(`\n▶ Scontro ${n}: ${s.casa} vs ${s.trasferta}`);
  run(["still", `Locandina-${n}`, `${out}/locandina-${nome}.png`]);
  run(["still", `Presentazione-${n}`, `${out}/presentazione-${nome}.png`]);
  run(["render", `Highlight-${n}`, `${out}/highlight-${nome}.mp4`]);
});

console.log(`\n✔ Fatto! File in ${out}`);
