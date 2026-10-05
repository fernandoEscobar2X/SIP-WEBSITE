import type { MetadataRoute } from "next";
import { alternatesFor, type RouteKey, routes } from "@/i18n/routes";
import { localeTag, routing } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

/** Todas las páginas en ambos idiomas, cada una con sus alternativas hreflang. */
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const key of Object.keys(routes) as RouteKey[]) {
    const paths = alternatesFor(key);
    const languages = Object.fromEntries(
      routing.locales.map((l) => [localeTag[l].lang, absoluteUrl(paths[l])]),
    );
    for (const locale of routing.locales) {
      entries.push({
        url: absoluteUrl(paths[locale]),
        changeFrequency: "monthly",
        priority: key === "home" ? 1 : 0.7,
        alternates: { languages },
      });
    }
  }
  return entries;
}
