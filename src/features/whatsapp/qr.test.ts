import { encode } from "uqr";
import { describe, expect, it } from "vitest";
import { site, waLink } from "@/lib/site";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { whatsappQr } from "./qr.generated";
import { qrMatrixToPath, qrPathToMatrix } from "./qr-path";

describe("QR de WhatsApp", () => {
  it("el path reconstruye exactamente la matriz del código", () => {
    const qr = encode("https://wa.me/526645296002?text=prueba", { ecc: "M", border: 0 });
    expect(qrPathToMatrix(qrMatrixToPath(qr.data), qr.size)).toEqual(qr.data);
  });

  it("cada idioma apunta al número de SIP con su mensaje", () => {
    const messages = { es, en };
    for (const locale of ["es", "en"] as const) {
      const { url, size, d } = whatsappQr[locale];
      expect(url).toBe(waLink(messages[locale].WhatsApp.message));
      expect(url.startsWith(`https://wa.me/${site.whatsapp.waNumber}?`)).toBe(true);
      expect(qrPathToMatrix(d, size)).toEqual(encode(url, { ecc: "M", border: 0 }).data);
    }
  });
});
