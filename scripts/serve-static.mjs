/**
 * Servidor estático local que imita a Netlify para pruebas (Playwright, Lighthouse, ZAP):
 * URLs limpias (/es/servicios → es/servicios.html), "/" según Accept-Language con la misma regla
 * que Netlify, 404 por idioma, compresión brotli/gzip y las cabeceras de src/lib/security.ts (las
 * mismas que se publican en _headers).
 * Cada archivo se comprime una sola vez y se sirve desde memoria, como un CDN: comprimir con
 * brotli máximo en cada petición satura el CPU cuando varios navegadores piden a la vez.
 * Uso: node scripts/serve-static.mjs [puerto]   (sirve ./out)
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { brotliCompress, gzip } from "node:zlib";
import { parseAcceptLanguage, preferredLocale } from "../src/i18n/negotiate.ts";
import { headerRules, headersFor } from "../src/lib/security.ts";
import { analyticsOrigins } from "../src/lib/site.ts";

const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

const root = resolve(process.cwd(), "out");
const port = Number(process.argv[2] ?? process.env.PORT ?? 4321);
const rules = headerRules({ analyticsOrigins: analyticsOrigins() });
/** Archivos de configuración de Netlify: los consume Netlify y nunca se sirven. */
const netlifyConfig = new Set(["/_headers", "/_redirects"]);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ico": "image/x-icon",
};
const compressible = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".xml", ".txt", ".svg"]);

/** Archivo dentro de ./out para la ruta pedida, o null. Nunca sale de ./out. */
function resolveFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // %-codificación inválida
  }
  const clean = normalize(decoded).replace(/^([/\\])+/, "");
  const candidates = [clean, `${clean}.html`, join(clean, "index.html")];
  for (const candidate of candidates) {
    const file = join(root, candidate);
    // Con separador: una carpeta hermana como "out-otra" no debe pasar por "out".
    if (file !== root && !file.startsWith(root + sep)) return null;
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

/** Versiones comprimidas por archivo, codificación y fecha de modificación. */
const compressedCache = new Map();

function compressed(file, encoding) {
  const key = `${file}|${encoding}|${statSync(file).mtimeMs}`;
  let body = compressedCache.get(key);
  if (!body) {
    body = readFile(file).then((raw) => (encoding === "br" ? brotli(raw) : gzipAsync(raw)));
    // Un fallo no se queda en caché: la siguiente petición lo vuelve a intentar.
    body.catch(() => compressedCache.delete(key));
    compressedCache.set(key, body);
  }
  return body;
}

async function send(req, res, file, status = 200) {
  const ext = extname(file);
  const { pathname } = new URL(req.url, `http://localhost:${port}`);
  // Sin regla de caché, Netlify revalida en cada visita: lo mismo aquí.
  const headers = {
    "Cache-Control": "public, max-age=0, must-revalidate",
    ...headersFor(pathname, rules),
    "Content-Type": types[ext] ?? "application/octet-stream",
  };
  const accept = String(req.headers["accept-encoding"] ?? "");
  const encoding = !compressible.has(ext)
    ? null
    : accept.includes("br")
      ? "br"
      : accept.includes("gzip")
        ? "gzip"
        : null;
  if (compressible.has(ext)) headers.Vary = "Accept-Encoding";
  if (!encoding) {
    res.writeHead(status, headers);
    if (req.method === "HEAD") return res.end();
    createReadStream(file).pipe(res);
    return;
  }
  try {
    const body = await compressed(file, encoding);
    headers["Content-Encoding"] = encoding;
    headers["Content-Length"] = body.length;
    res.writeHead(status, headers);
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(500).end();
  }
}

createServer((req, res) => {
  // Sitio estático: solo lectura. Los formularios solo se procesan en Netlify (Netlify Forms);
  // aquí un envío responde 405 en vez de fingir que se recibió.
  const { pathname } = new URL(req.url, `http://localhost:${port}`);
  // Toda respuesta lleva las cabeceras de seguridad, también redirecciones y errores.
  const security = headersFor(pathname, rules);
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { ...security, Allow: "GET, HEAD" }).end();
    return;
  }

  if (pathname === "/") {
    const locale = preferredLocale(parseAcceptLanguage(String(req.headers["accept-language"] ?? "")));
    res.writeHead(302, { ...security, Location: `/${locale}` }).end();
    return;
  }

  const file = netlifyConfig.has(pathname) ? null : resolveFile(pathname);
  if (file) return void send(req, res, file);

  const notFound = resolveFile(pathname.startsWith("/en") ? "/en/404" : "/es/404");
  if (notFound) return void send(req, res, notFound, 404);
  res.writeHead(404, security).end("404");
}).listen(port, () => console.log(`Sirviendo ./out en http://localhost:${port}`));
