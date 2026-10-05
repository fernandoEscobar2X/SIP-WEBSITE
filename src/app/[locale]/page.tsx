import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import type { Locale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { HomeView } from "@/views/HomeView";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ locale: (await rootLocale()) as Locale, route: "home" });
}

export default function Page() {
  return <HomeView />;
}
