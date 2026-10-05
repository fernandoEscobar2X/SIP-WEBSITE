import type { Metadata } from "next";
import { ContactSection } from "@/features/contact/ContactSection";
import { pageMetadata } from "@/lib/seo";

// Ruta física en en: el otro idioma usa su propia URL traducida.
export const dynamicParams = false;
export const generateStaticParams = () => [{ locale: "en" }];

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ locale: "en", route: "contact" });
}

export default function Page() {
  return <ContactSection headingLevel={1} />;
}
