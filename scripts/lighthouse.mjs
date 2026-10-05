/**
 * Auditoría Lighthouse con los umbrales del plan:
 *   Performance móvil ≥ 85 (desktop ≥ 90) · Accesibilidad, Buenas prácticas,
 *   SEO y Agentic Browsing = 100.
 * Construye con SITE_URL local (canonical del mismo origen), sirve ./out con el
 * servidor que imita a Netlify y audita cada página en móvil y desktop.
 * Uso: npm run lighthouse [-- --skip-build] [-- --only=es,en/services]
 *
 * La medición oficial corre en CI (Linux). En Windows, Next 16.3 escribe mal los
 * archivos de prefetch del export (bug de separadores de ruta en
 * next/dist/export/index.js) y aparecen 404 en consola que no existen en producción.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const PORT = 4321;
const args = process.argv.slice(2);
const remoteOrigin = args.find((arg) => arg.startsWith("--origin="))?.slice(9);
const ORIGIN = remoteOrigin ?? `http://localhost:${PORT}`;
const skipBuild = Boolean(remoteOrigin) || args.includes("--skip-build");
const formFactors = args.includes("--desktop-only") ? ["desktop"] : ["mobile", "desktop"];
// Rutas sin barra inicial ("es,en/services"): así ninguna shell las reinterpreta como rutas de disco.
const only = args
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",")
  .map((p) => `/${p}`);

const PAGES = only ?? ["/es", "/en", "/es/servicios", "/en/about", "/en/contact", "/es/404"];
const THRESHOLDS = {
  mobile: { performance: 0.85, accessibility: 1, "best-practices": 1, seo: 1, "agentic-browsing": 1 },
  desktop: { performance: 0.9, accessibility: 1, "best-practices": 1, seo: 1, "agentic-browsing": 1 },
};

if (!skipBuild) {
  const build = spawnSync("npm run build", {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NEXT_PUBLIC_SITE_URL: ORIGIN },
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const server = remoteOrigin
  ? null
  : spawn(process.execPath, ["scripts/serve-static.mjs", String(PORT)], { stdio: "ignore" });
if (server) await new Promise((r) => setTimeout(r, 800));

const outDir = resolve(".lighthouse");
mkdirSync(outDir, { recursive: true });
const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });

const failures = [];
const summary = [];
try {
  for (const formFactor of formFactors) {
    for (const page of PAGES) {
      // 404: se audita aparte porque su estado HTTP es 404 por diseño (SEO lo marca).
      const isNotFound = page.endsWith("/404");
      const result = await lighthouse(
        `${ORIGIN}${page}`,
        { port: chrome.port, output: "html", logLevel: "error" },
        formFactor === "desktop" ? desktopConfig : undefined,
      );
      const lhr = result.lhr;
      const scores = Object.fromEntries(Object.entries(lhr.categories).map(([k, v]) => [k, v.score]));
      const name = `${formFactor}${page.replaceAll("/", "_")}`;
      writeFileSync(resolve(outDir, `${name}.html`), result.report);
      writeFileSync(resolve(outDir, `${name}.json`), JSON.stringify(lhr));
      summary.push({ formFactor, page, scores });

      const line = Object.entries(scores)
        .map(([k, v]) => `${k} ${Math.round((v ?? 0) * 100)}`)
        .join(" · ");
      console.log(`${formFactor.padEnd(7)} ${page.padEnd(20)} ${line}`);

      for (const [category, min] of Object.entries(THRESHOLDS[formFactor])) {
        if (isNotFound && category === "seo") continue;
        const score = scores[category];
        if (score === undefined) continue;
        if (score === null || score < min) {
          const failing = Object.values(lhr.audits)
            .filter(
              (a) =>
                a.score !== null &&
                a.score < 1 &&
                lhr.categories[category].auditRefs.some((r) => r.id === a.id && r.weight > 0),
            )
            .map((a) => `${a.id} (${a.displayValue ?? a.score})`);
          failures.push(
            `${formFactor} ${page} → ${category} ${Math.round((score ?? 0) * 100)} < ${min * 100}: ${failing.join(", ")}`,
          );
        }
      }
    }
  }
} finally {
  await chrome.kill();
  server?.kill();
}

writeFileSync(resolve(outDir, "summary.json"), JSON.stringify(summary, null, 2));
if (failures.length) {
  const list = failures.map((f) => `  - ${f}`).join("\n");
  console.error(`\nNo cumple umbrales:\n${list}`);
  process.exit(1);
}
console.log("\nTodas las páginas cumplen los umbrales del plan.");
