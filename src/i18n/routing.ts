import { defineRouting } from "next-intl/routing";

/**
 * Sitio estático sin proxy: el idioma siempre va en la URL y no se negocia
 * en servidor. La negociación de "/" la hacen las reglas de Netlify.
 */
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

/** Etiqueta BCP 47 para `<html lang>`, hreflang y Open Graph. */
export const localeTag: Record<Locale, { lang: string; og: string }> = {
  es: { lang: "es-MX", og: "es_MX" },
  en: { lang: "en", og: "en_US" },
};
