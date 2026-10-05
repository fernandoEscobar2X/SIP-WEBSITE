import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageShellView } from "@/views/PageShellView";

// Ruta física en en: el otro idioma usa su propia URL traducida.
export const dynamicParams = false;
export const generateStaticParams = () => [{ locale: "en" }];

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ locale: "en", route: "services" });
}

export default function Page() {
  return <PageShellView page="services" />;
}
