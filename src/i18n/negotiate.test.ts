import { describe, expect, it } from "vitest";
import { parseAcceptLanguage, preferredLocale, rootRedirectScript } from "./negotiate";

describe("idioma para la raíz", () => {
  it("inglés solo si es la primera preferencia; si no, español", () => {
    expect(preferredLocale(["en-US", "es-MX"])).toBe("en");
    expect(preferredLocale(["EN"])).toBe("en");
    expect(preferredLocale(["es-MX", "en"])).toBe("es");
    expect(preferredLocale(["fr-FR", "en"])).toBe("es");
    expect(preferredLocale([])).toBe("es");
  });

  it("ordena Accept-Language por peso y respeta el orden ante empates", () => {
    expect(parseAcceptLanguage("es-MX,es;q=0.9,en;q=0.8")).toEqual(["es-MX", "es", "en"]);
    expect(parseAcceptLanguage("es;q=0.5, en-US")).toEqual(["en-US", "es"]);
    expect(parseAcceptLanguage("en;q=0, fr")).toEqual(["fr"]);
    expect(parseAcceptLanguage("")).toEqual([]);
  });

  it("el script en línea aplica la misma regla en el navegador", () => {
    const run = (languages: string[]) => {
      let target = "";
      const location = { search: "?a=1", hash: "#contacto", replace: (url: string) => (target = url) };
      new Function("location", "navigator", rootRedirectScript)(location, { languages, language: "" });
      return target;
    };
    expect(run(["en-US"])).toBe("/en?a=1#contacto");
    expect(run(["es-MX", "en"])).toBe("/es?a=1#contacto");
    expect(run([])).toBe("/es?a=1#contacto");
  });
});
