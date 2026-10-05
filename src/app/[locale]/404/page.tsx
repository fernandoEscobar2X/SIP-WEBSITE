import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { NotFoundView } from "@/views/NotFoundView";

/**
 * 404 por idioma como página estática (/es/404, /en/404). Netlify la sirve con
 * estado 404 para cualquier ruta inexistente de cada idioma (ver netlify.toml).
 */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    locale: (await rootLocale()) as Locale,
    route: "home",
    messageKey: "notFound",
    noindex: true,
  });
}

export default function Page() {
  return <NotFoundView />;
}
