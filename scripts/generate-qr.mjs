/**
 * Genera los QR de WhatsApp (uno por idioma, con el mensaje prellenado) como
 * trazos SVG listos para renderizar en línea. Corre antes de dev/build/test,
 * así el cliente no carga ninguna librería de QR.
 * Salida: src/features/whatsapp/qr.generated.ts (ignorado por git).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encode } from "uqr";
import { qrMatrixToPath } from "../src/features/whatsapp/qr-path.ts";
import { site, waLink } from "../src/lib/site.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["es", "en"];

const out = {};
for (const locale of locales) {
  const messages = JSON.parse(readFileSync(resolve(root, `src/messages/${locale}.json`), "utf8"));
  const url = waLink(messages.WhatsApp.message);
  const qr = encode(url, { ecc: "M", border: 0 });
  out[locale] = { url, size: qr.size, d: qrMatrixToPath(qr.data) };
}

const file = resolve(root, "src/features/whatsapp/qr.generated.ts");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(
  file,
  `// Archivo generado por scripts/generate-qr.mjs. No editar a mano.\n// Número: ${site.whatsapp.display}\nexport const whatsappQr = ${JSON.stringify(out, null, 2)} as const;\n`,
);
console.log(`QR de WhatsApp generado (${locales.join(", ")})`);
