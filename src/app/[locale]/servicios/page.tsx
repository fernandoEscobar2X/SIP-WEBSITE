import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageShellView } from "@/views/PageShellView";

// Ruta física en es: el otro idioma usa su propia URL traducida.
export const dynamicParams = false;
export const generateStaticParams = () => [{ locale: "es" }];

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ locale: "es", route: "services" });
}

export default function Page() {
  return <PageShellView page="services" />;
}
