import type { Metadata } from "next";
import { ContactSection } from "@/features/contact/ContactSection";
import { pageMetadata } from "@/lib/seo";

// Ruta física en es: el otro idioma usa su propia URL traducida.
export const dynamicParams = false;
export const generateStaticParams = () => [{ locale: "es" }];

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ locale: "es", route: "contact" });
}

export default function Page() {
  return <ContactSection headingLevel={1} />;
}
