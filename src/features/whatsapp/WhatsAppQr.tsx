import type { Locale } from "@/i18n/routing";
import { whatsappQr } from "./qr.generated";

/** QR estático (generado en build). Zona de silencio de 2 módulos para lectura confiable. */
export function WhatsAppQr({
  locale,
  label,
  className,
}: {
  locale: Locale;
  label: string;
  className?: string;
}) {
  const { size, d } = whatsappQr[locale];
  const quiet = 2;
  return (
    <svg
      className={className}
      viewBox={`${-quiet} ${-quiet} ${size + quiet * 2} ${size + quiet * 2}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect
        x={-quiet}
        y={-quiet}
        width={size + quiet * 2}
        height={size + quiet * 2}
        fill="var(--color-blanco)"
      />
      <path d={d} fill="currentColor" />
    </svg>
  );
}
