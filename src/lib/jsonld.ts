import type { Locale } from "@/i18n/routing";
import { localeTag } from "@/i18n/routing";
import { SITE_URL, site } from "./site";

/**
 * Datos estructurados de la empresa (schema.org): Organization + ProfessionalService
 * con dirección en Tijuana. Se inyecta una vez por página desde el layout.
 */
export function organizationJsonLd(locale: Locale, description: string) {
  const id = `${SITE_URL}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": id,
        name: site.name,
        alternateName: site.shortName,
        url: `${SITE_URL}/${locale}`,
        logo: `${SITE_URL}/brand/sip-avatar-512.webp`,
        foundingDate: String(site.foundingYear),
        email: site.email,
        telephone: site.whatsapp.e164,
      },
      {
        "@type": "ProfessionalService",
        "@id": `${SITE_URL}/#business`,
        name: site.name,
        parentOrganization: { "@id": id },
        description,
        url: `${SITE_URL}/${locale}`,
        image: `${SITE_URL}/brand/sip-avatar-512.webp`,
        email: site.email,
        telephone: site.whatsapp.e164,
        inLanguage: localeTag[locale].lang,
        areaServed: ["MX", "US"],
        address: {
          "@type": "PostalAddress",
          addressLocality: site.address.locality,
          addressRegion: site.address.region,
          addressCountry: site.address.countryCode,
        },
      },
    ],
  };
}

/** Serializa JSON-LD escapando "<" para que no pueda cerrar el <script>. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
