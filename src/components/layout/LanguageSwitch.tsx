"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { translatePath } from "@/i18n/routes";
import { type Locale, localeTag } from "@/i18n/routing";

type Props = {
  to: Locale;
  /** Nombre del idioma destino en su propio idioma ("English", "Español"). */
  label: string;
  className?: string;
};

/**
 * Lleva a la misma página en el otro idioma (slugs traducidos incluidos).
 * `lang` en el enlace hace que el lector de pantalla pronuncie bien el nombre.
 */
export function LanguageSwitch({ to, label, className }: Props) {
  const pathname = usePathname();
  return (
    <Link
      href={translatePath(pathname, to)}
      hrefLang={localeTag[to].lang}
      lang={localeTag[to].lang}
      className={className}
      prefetch={false}
    >
      {label}
    </Link>
  );
}
