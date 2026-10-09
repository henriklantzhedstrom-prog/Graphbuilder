// Bygger appen som EN html-fil för publicering som egen sida (t.ex. claude.ai-artifact).
// Skriptet bäddas in som data-URL (inte som inline <script>), eftersom publiceringstjänsten
// avvisar stora inline-skript. CSS bäddas in i en <style>.
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

execSync("npm run build", {
  stdio: "inherit",
  env: { ...process.env, VITE_BASE_PATH: "./", VITE_STABLE_ASSETS: "1" },
});

const html = readFileSync("dist/index.html", "utf8");
const js = readFileSync("dist/assets/app.js");
const css = readFileSync("dist/assets/index.css", "utf8");
const out = html
  .replace(
    /<script type="module" crossorigin src="\.\/assets\/app\.js"><\/script>/,
    `<script type="module" src="data:text/javascript;base64,${js.toString("base64")}"></script>`,
  )
  .replace(
    /<link rel="stylesheet" crossorigin href="\.\/assets\/index\.css">/,
    `<style>${css}</style>`,
  );
if (out === html || out.includes("./assets/")) {
  throw new Error("build-single: could not inline assets – index.html layout changed?");
}
mkdirSync("dist-single", { recursive: true });
writeFileSync("dist-single/index.html", out);
console.log(`dist-single/index.html ${(out.length / 1024).toFixed(0)} kB`);
