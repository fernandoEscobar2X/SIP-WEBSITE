import type { ReactNode } from "react";
import { InlineScript } from "@/components/InlineScript";
import { rootRedirectScript } from "@/i18n/negotiate";

/**
 * Layout raíz mínimo para "/". En producción Netlify redirige "/" según el idioma del navegador
 * antes de llegar aquí. Esta página es el respaldo (local, `next dev`, o si la regla no aplica):
 * el script del `<head>` elige el idioma con la misma regla y redirige antes de pintar nada.
 */
export default function RootFallbackLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        <InlineScript html={rootRedirectScript} />
      </head>
      <body>{children}</body>
    </html>
  );
}
