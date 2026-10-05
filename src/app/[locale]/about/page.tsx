import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { AboutView } from "@/views/AboutView";

// Ruta física en en: el otro idioma usa su propia URL traducida.
export const dynamicParams = false;
export const generateStaticParams = () => [{ locale: "en" }];

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ locale: "en", route: "about" });
}

export default function Page() {
  return <AboutView />;
}
