import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { AboutView } from "@/views/AboutView";

// Ruta física en es: el otro idioma usa su propia URL traducida.
export const dynamicParams = false;
export const generateStaticParams = () => [{ locale: "es" }];

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ locale: "es", route: "about" });
}

export default function Page() {
  return <AboutView />;
}
