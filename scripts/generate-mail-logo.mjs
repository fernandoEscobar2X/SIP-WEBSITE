/** Rasteriza la marca original para correo y la incorpora en el bundle de las funciones. */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = new URL("../public/brand/sip-logo-color.svg", import.meta.url);
const png = await sharp(fileURLToPath(source), { density: 144 })
  .resize({ width: 380 })
  .flatten({ background: "#ffffff" })
  .png({ palette: true, colours: 128, compressionLevel: 9 })
  .toBuffer();

await writeFile(
  new URL("../src/server/contact/logo.generated.ts", import.meta.url),
  `// Generado desde public/brand/sip-logo-color.svg. No editar.\nexport const mailLogo = { contentId: "sip-logo", content: "${png.toString("base64")}" } as const;\n`,
);
console.log(`Logo de SIP preparado para correo (${png.length} bytes).`);
