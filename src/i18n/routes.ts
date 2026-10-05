import type { Locale } from "./routing";

/**
 * Mapa de rutas localizadas. Cada clave es una página; cada idioma tiene su
 * propia URL física (no hay reescrituras en servidor).
 * Si agregas una página, agrégala aquí y crea su archivo en app/[locale].
 */
export const routes = {
  home: { es: "", en: "" },
  services: { es: "/servicios", en: "/services" },
  about: { es: "/nosotros", en: "/about" },
  contact: { es: "/contacto", en: "/contact" },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof routes;

export function href(locale: Locale, key: RouteKey): string {
  return `/${locale}${routes[key][locale]}`;
}

export type Alternates = Record<Locale, string>;

export function alternatesFor(key: RouteKey): Alternates {
  return { es: href("es", key), en: href("en", key) };
}

/**
 * Traduce una ruta actual a su equivalente en otro idioma.
 * Se usa en el selector de idioma (cliente), a partir del pathname.
 */
export function translatePath(pathname: string, to: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  const from = segments[0] as Locale | undefined;
  if (!from || (from !== "es" && from !== "en")) return href(to, "home");

  const rest = `/${segments.slice(1).join("/")}`.replace(/\/$/, "");
  if (rest === "") return href(to, "home");

  for (const key of Object.keys(routes) as RouteKey[]) {
    const localized = routes[key][from];
    if (!localized) continue;
    if (rest === localized) return href(to, key);
  }
  return href(to, "home");
}
