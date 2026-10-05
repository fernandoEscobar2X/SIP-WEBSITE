/**
 * Escribe public/_headers (Netlify lo lee del directorio publicado) desde src/lib/security.ts.
 * Corre antes del build: los orígenes de la analítica dependen de NEXT_PUBLIC_UMAMI_WEBSITE_ID.
 * Salida ignorada por git: la fuente es el módulo tipado.
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { headerRules, renderHeadersFile } from "../src/lib/security.ts";
import { analyticsOrigins } from "../src/lib/site.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
writeFileSync(
  resolve(root, "public/_headers"),
  renderHeadersFile(headerRules({ analyticsOrigins: analyticsOrigins() })),
);
