import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import Script from "next/script";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { DaypartSync } from "@/components/DaypartSync";
import { InlineScript } from "@/components/InlineScript";
import { Footer } from "@/components/layout/Footer";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { localeTag, routing } from "@/i18n/routing";
import { bootScript } from "@/lib/boot";
import { organizationJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { SITE_URL, site } from "@/lib/site";
import { SmoothScroll } from "@/motion/SmoothScroll";
import { TransitionProvider } from "@/motion/transitions/TransitionProvider";
import { fontVariables } from "@/styles/fonts";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await rootLocale();
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : "es",
    namespace: "Meta",
  });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("siteName"), template: t("titleTemplate") },
    applicationName: site.shortName,
    icons: {
      icon: [
        { url: "/brand/sip-avatar.svg", type: "image/svg+xml" },
        { url: "/brand/icon-192.png", sizes: "192x192" },
      ],
      apple: "/brand/apple-touch-icon.png",
    },
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#011631",
  colorScheme: "dark",
};

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  const meta = await getTranslations("Meta");
  const jsonLd = organizationJsonLd(locale, meta("home.description"));

  return (
    // suppressHydrationWarning: el script de arranque agrega data-daypart/data-motion a <html>
    // antes de hidratar (solo afecta a los atributos de este elemento).
    <html lang={localeTag[locale].lang} className={fontVariables} suppressHydrationWarning>
      <head />
      <body>
        {/* Antes de cualquier contenido visible; fuera del head que Next reorganiza para metadata. */}
        <InlineScript html={bootScript} />
        <DaypartSync />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD serializado y escapado en serializeJsonLd
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
        <SmoothScroll>
          <TransitionProvider>
            <SiteChrome locale={locale} />
            <main id="contenido" tabIndex={-1}>
              {children}
            </main>
            <Footer locale={locale} />
          </TransitionProvider>
        </SmoothScroll>
        {site.analytics.umamiWebsiteId ? (
          <Script
            src={site.analytics.scriptSrc}
            data-website-id={site.analytics.umamiWebsiteId}
            strategy="lazyOnload"
          />
        ) : null}
      </body>
    </html>
  );
}
