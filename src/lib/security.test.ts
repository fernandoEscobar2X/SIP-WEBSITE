import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, headerRules, headersFor, renderHeadersFile } from "./security";

const directive = (csp: string, name: string) =>
  csp
    .split("; ")
    .find((d) => d.startsWith(`${name} `))
    ?.slice(name.length + 1);

describe("cabeceras de seguridad", () => {
  it("la CSP cierra todo al propio origen y prohíbe incrustar el sitio", () => {
    const csp = contentSecurityPolicy({ analyticsOrigins: [] });
    expect(directive(csp, "default-src")).toBe("'self'");
    expect(directive(csp, "object-src")).toBe("'none'");
    expect(directive(csp, "frame-ancestors")).toBe("'none'");
    expect(directive(csp, "base-uri")).toBe("'self'");
    expect(directive(csp, "form-action")).toBe("'self'");
    expect(directive(csp, "connect-src")).toBe("'self'");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("los orígenes de la analítica solo entran si está activa", () => {
    const csp = contentSecurityPolicy({ analyticsOrigins: ["https://cloud.umami.is"] });
    expect(directive(csp, "script-src")).toContain("https://cloud.umami.is");
    expect(directive(csp, "connect-src")).toContain("https://cloud.umami.is");
    expect(directive(csp, "img-src")).not.toContain("umami");
  });

  it("cada ruta recibe sus cabeceras sin que las reglas se pisen", () => {
    const rules = headerRules({ analyticsOrigins: [] });
    const page = headersFor("/es/nosotros", rules);
    expect(page["X-Frame-Options"]).toBe("DENY");
    expect(page["Cache-Control"]).toBeUndefined();
    const chunk = headersFor("/_next/static/chunks/app.js", rules);
    expect(chunk["Cache-Control"]).toContain("immutable");
    expect(chunk["Content-Security-Policy"]).toBeDefined();

    const names = rules.flatMap((rule) => Object.keys(rule.headers));
    expect(new Set(names).size).toBe(names.length - 1); // solo Cache-Control se repite, en rutas disjuntas
  });

  it("el archivo _headers sigue el formato de Netlify", () => {
    const file = renderHeadersFile(headerRules({ analyticsOrigins: [] }));
    expect(file).toMatch(/^\/\*\n {2}Content-Security-Policy: default-src 'self';/m);
    expect(file).toMatch(/^\/_next\/static\/\*\n {2}Cache-Control: public, max-age=31536000, immutable$/m);
  });
});
