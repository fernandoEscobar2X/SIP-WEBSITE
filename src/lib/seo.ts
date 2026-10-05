import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternatesFor, type RouteKey } from "@/i18n/routes";
import { type Locale, localeTag, routing } from "@/i18n/routing";
import { SITE_URL } from "./site";

type PageSeo = {
  locale: Locale;
  route: RouteKey;
  /** Clave en Meta.* de los mensajes (por defecto, la de la ruta). */
  messageKey?: "home" | "services" | "about" | "contact" | "notFound";
  noindex?: boolean;
};

/**
 * Metadata por página: título, descripción, canonical, hreflang (es-MX / en /
 * x-default) y Open Graph. Todas las URLs son absolutas con SITE_URL.
 */
export async function pageMetadata({ locale, route, messageKey, noindex }: PageSeo): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "Meta" });
  const key = messageKey ?? (route as NonNullable<PageSeo["messageKey"]>);
  const resolvedTitle = t(`${key}.title`);
  const resolvedDescription = t(`${key}.description`);
  const paths = alternatesFor(route);

  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[localeTag[l].lang] = paths[l];
  languages["x-default"] = paths[routing.defaultLocale];

  return {
    title: route === "home" ? { absolute: `${resolvedTitle} | SIP` } : resolvedTitle,
    description: resolvedDescription,
    alternates: { canonical: paths[locale], languages },
    openGraph: {
      type: "website",
      url: paths[locale],
      siteName: t("siteName"),
      title: resolvedTitle,
      description: resolvedDescription,
      locale: localeTag[locale].og,
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => localeTag[l].og),
    },
    twitter: { card: "summary_large_image", title: resolvedTitle, description: resolvedDescription },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}
