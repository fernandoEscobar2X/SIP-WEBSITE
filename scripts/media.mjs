/**
 * Medios: convierte los originales de `media-src/` (fuera de git) en variantes para la web.
 *
 *   node scripts/media.mjs            genera lo que falte o haya cambiado
 *   node scripts/media.mjs --force    regenera todo
 *
 * Por cada imagen `media-src/<id>.png` escribe `public/media/img/<id>-<hash>/<ancho>.avif|webp`
 * en una escalera de anchos según su proporción, y el manifiesto tipado
 * `src/media/manifest.generated.ts` (medidas, anchos, hash y color promedio para el fondo
 * mientras carga). El hash sale del original y de los ajustes de codificación: si cualquiera
 * cambia, cambia la ruta, y por eso Netlify puede cachear `/media/*` como inmutable.
 * Las variantes y el manifiesto se versionan: el build no depende de los originales.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "media-src");
const outputDir = path.join(root, "public", "media", "img");
const manifestPath = path.join(root, "src", "media", "manifest.generated.ts");
const force = process.argv.includes("--force");

/** Anchos por orientación: cubren móviles (1× y 2×), laptops y pantallas grandes. */
const LADDERS = {
  landscape: [640, 960, 1280, 1920, 2560],
  portrait: [480, 720, 1080, 1440],
};

// Calidades medidas a ojo sobre los azules oscuros (donde primero aparece el banding).
const SETTINGS = {
  avif: { quality: 52, effort: 6, chromaSubsampling: "4:2:0" },
  webp: { quality: 76, effort: 5, smartSubsample: true },
};
const ENCODERS = {
  avif: (image) => image.avif(SETTINGS.avif),
  webp: (image) => image.webp(SETTINGS.webp),
};

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function exists(file) {
  return (await stat(file).catch(() => undefined)) !== undefined;
}

function hex(channel) {
  return Math.round(channel).toString(16).padStart(2, "0");
}

async function processImage(file) {
  const id = file.replace(/\.png$/, "");
  if (!ID_PATTERN.test(id)) throw new Error(`Nombre inválido: ${file} (solo minúsculas, números y guiones)`);
  const source = path.join(sourceDir, file);
  const { width, height } = await sharp(source).metadata();
  if (!width || !height) throw new Error(`No se pudieron leer las medidas de ${file}`);
  const ladder = width >= height ? LADDERS.landscape : LADDERS.portrait;
  const widths = ladder.filter((w) => w <= width);
  if (widths.at(-1) !== width) widths.push(width);

  const hash = createHash("sha256")
    .update(await readFile(source))
    .update(JSON.stringify({ SETTINGS, widths }))
    .digest("hex")
    .slice(0, 10);
  const folder = `${id}-${hash}`;
  const dir = path.join(outputDir, folder);
  const outputs = widths.flatMap((w) =>
    Object.keys(ENCODERS).map((format) => path.join(dir, `${w}.${format}`)),
  );
  // Color promedio (la imagen reducida a 1 px): el fondo que se ve mientras carga.
  const pixel = await sharp(source).resize(1, 1, { fit: "fill" }).removeAlpha().raw().toBuffer();
  const color = `#${hex(pixel[0])}${hex(pixel[1])}${hex(pixel[2])}`;
  const entry = { width, height, widths, hash, color };

  if (!force && (await Promise.all(outputs.map(exists))).every(Boolean))
    return { id, folder, entry, written: 0 };
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  let bytes = 0;
  for (const w of widths) {
    for (const [format, encode] of Object.entries(ENCODERS)) {
      const target = path.join(dir, `${w}.${format}`);
      const info = await encode(sharp(source).resize({ width: w, kernel: "lanczos3" })).toFile(target);
      bytes += info.size;
    }
  }
  return { id, folder, entry, written: bytes };
}

function manifestSource(entries) {
  const body = entries
    .map(({ id, entry }) => {
      const { width, height, widths, hash, color } = entry;
      return `  "${id}": { width: ${width}, height: ${height}, widths: [${widths.join(", ")}], hash: "${hash}", color: "${color}" },`;
    })
    .join("\n");
  return `// Generado por scripts/media.mjs a partir de media-src/. No editar a mano.

export const mediaManifest = {
${body}
} as const;
`;
}

const files = (await readdir(sourceDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
  .map((entry) => entry.name)
  .sort();
if (files.length === 0) throw new Error(`No hay originales .png en ${sourceDir}`);

const results = [];
for (const file of files) {
  const result = await processImage(file);
  results.push(result);
  const status = result.written ? `${(result.written / 1024).toFixed(0)} KB` : "sin cambios";
  console.log(`${result.id}: ${status}`);
}

// Carpetas que ya no corresponden a ningún original o a su hash vigente se eliminan.
const current = new Set(results.map(({ folder }) => folder));
for (const dir of await readdir(outputDir).catch(() => [])) {
  if (!current.has(dir)) {
    await rm(path.join(outputDir, dir), { recursive: true, force: true });
    console.log(`${dir}: eliminado (versión anterior o sin original)`);
  }
}

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, manifestSource(results));
console.log(`Manifiesto: ${path.relative(root, manifestPath)} (${results.length} imágenes)`);
