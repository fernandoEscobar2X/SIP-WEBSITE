/**
 * Cabeceras HTTP del sitio. Única fuente: `scripts/generate-headers.mjs` las escribe en el
 * `_headers` que lee Netlify y `scripts/serve-static.mjs` las aplica en local, así el build de
 * producción se prueba con las mismas cabeceras que se publican.
 */

export interface HeaderRule {
  /** Ruta al estilo de Netlify: exacta o con `*` al final (prefijo). */
  readonly path: string;
  readonly headers: Readonly<Record<string, string>>;
}

export interface SecurityOptions {
  /** Orígenes de la analítica (script y envío de datos); vacío si está desactivada. */
  readonly analyticsOrigins: readonly string[];
}

/**
 * CSP para un export estático (guía de Next 16, "Without Nonces"): sin servidor no hay nonce por
 * petición, y Next escribe scripts en línea (la carga RSC) que cambian en cada build. Por eso
 * scripts y estilos admiten `'unsafe-inline'`; todo lo demás queda cerrado al propio origen. El
 * sitio no muestra contenido de usuarios ni de la URL, así que la CSP es defensa en profundidad.
 */
export function contentSecurityPolicy({ analyticsOrigins: umami }: SecurityOptions): string {
  const directives: Record<string, readonly string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...umami],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "media-src": ["'self'"],
    "connect-src": ["'self'", ...umami],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

const IMMUTABLE = "public, max-age=31536000, immutable";

export function headerRules(options: SecurityOptions): readonly HeaderRule[] {
  return [
    {
      path: "/*",
      headers: {
        "Content-Security-Policy": contentSecurityPolicy(options),
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Strict-Transport-Security": "max-age=31536000",
      },
    },
    // Recursos con hash en el nombre (Next y scripts/media.mjs): nunca cambian de contenido.
    { path: "/_next/static/*", headers: { "Cache-Control": IMMUTABLE } },
    { path: "/media/*", headers: { "Cache-Control": IMMUTABLE } },
  ];
}

const matches = (pattern: string, pathname: string) =>
  pattern.endsWith("*") ? pathname.startsWith(pattern.slice(0, -1)) : pathname === pattern;

/** Cabeceras que corresponden a una ruta (las reglas no repiten cabeceras entre sí). */
export function headersFor(pathname: string, rules: readonly HeaderRule[]): Record<string, string> {
  return Object.assign(
    {},
    ...rules.filter((rule) => matches(rule.path, pathname)).map((rule) => rule.headers),
  );
}

/** Archivo `_headers` de Netlify. */
export function renderHeadersFile(rules: readonly HeaderRule[]): string {
  const blocks = rules.map(
    (rule) =>
      `${rule.path}\n${Object.entries(rule.headers)
        .map(([name, value]) => `  ${name}: ${value}`)
        .join("\n")}`,
  );
  return `# Generado por scripts/generate-headers.mjs desde src/lib/security.ts. No editar a mano.\n${blocks.join("\n")}\n`;
}
