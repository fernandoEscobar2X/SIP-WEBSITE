/**
 * Idioma para quien entra a "/": inglés si es la primera preferencia del navegador; si no,
 * español. Es la misma regla que aplica Netlify (`netlify.toml`, condición `Language`).
 *
 * Sin dependencias ni referencias externas: también se serializa como texto para el script en
 * línea de la página raíz, y la usa el servidor estático local.
 */
export function preferredLocale(languages: readonly string[]): "es" | "en" {
  return (languages[0] ?? "").trim().toLowerCase().startsWith("en") ? "en" : "es";
}

/** Preferencias de una cabecera Accept-Language, de mayor a menor peso. */
export function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.trim(), weight: q ? Number.parseFloat(q.slice(2)) || 0 : 1, index };
    })
    .filter((entry) => entry.tag !== "" && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)
    .map((entry) => entry.tag);
}

/**
 * Script de la página raíz: corre al leer el `<head>`, antes de pintar, y reemplaza la entrada del
 * historial (el botón atrás no regresa a "/"). Conserva la búsqueda y el ancla.
 */
export const rootRedirectScript = `location.replace("/"+(${preferredLocale.toString()})(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||""])+location.search+location.hash);`;
