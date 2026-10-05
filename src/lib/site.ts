/**
 * Datos de la empresa. Única fuente de verdad: ningún componente escribe
 * correo, teléfono o dominio a mano.
 */
export const site = {
  name: "Sistemas Inteligentes del Pacífico",
  shortName: "SIP",
  domain: "sipintegrales.com",
  foundingYear: 2026,
  email: "humberto@sipintegrales.com",
  whatsapp: {
    /** Número en formato wa.me (sin + ni espacios). */
    waNumber: "526645296002",
    e164: "+526645296002",
    display: "+52 664 529 6002",
  },
  address: {
    locality: "Tijuana",
    region: "Baja California",
    regionShort: "B.C.",
    countryCode: "MX",
  },
  timeZone: "America/Tijuana",
  analytics: {
    /** ID de sitio de Umami Cloud. Sin ID, la analítica queda desactivada. */
    umamiWebsiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? "",
    scriptSrc: "https://cloud.umami.is/script.js",
    /** Orígenes del script y del envío de datos: la CSP los permite solo si hay ID. */
    origins: ["https://cloud.umami.is", "https://api-gateway.umami.dev"],
  },
} as const;

/**
 * URL pública del sitio, resuelta en build.
 * Prioridad: variable explícita → URL de Netlify según contexto → localhost.
 * Producción fija el dominio de SIP con NEXT_PUBLIC_SITE_URL en netlify.toml.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const netlify = process.env.CONTEXT === "production" ? process.env.URL : process.env.DEPLOY_PRIME_URL;
  const url = explicit || netlify || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export const SITE_URL = resolveSiteUrl();

/** Orígenes externos que necesita la analítica en este build (ninguno si está desactivada). */
export function analyticsOrigins(): readonly string[] {
  return site.analytics.umamiWebsiteId ? site.analytics.origins : [];
}

export function waLink(message: string): string {
  return `https://wa.me/${site.whatsapp.waNumber}?text=${encodeURIComponent(message)}`;
}
