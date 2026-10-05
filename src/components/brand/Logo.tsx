import { useId } from "react";
import { LOGO_PATHS, LOGO_VIEWBOX } from "./logo-paths";

type Props = {
  className?: string;
  /** Texto accesible; si se omite, el logo es decorativo. */
  title?: string;
  /** "mono": todo en currentColor (p. ej. sobre fotografía). */
  mono?: boolean;
};

/**
 * Símbolo SIP en línea (1 KB, sin petición extra).
 * Las letras usan currentColor y la I toma su degradado de la superficie
 * (--logo-i-top / --logo-i-bottom, definidos en globals.css por data-surface),
 * igual que las versiones "color" y "sobre oscuro" de marca-sip.
 */
export function Logo({ className, title, mono = false }: Props) {
  const gradientId = useId();
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {!mono && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--logo-i-top)" }} />
            <stop offset="1" style={{ stopColor: "var(--logo-i-bottom)" }} />
          </linearGradient>
        </defs>
      )}
      <path d={LOGO_PATHS.s} fill="currentColor" />
      <path d={LOGO_PATHS.i} fill={mono ? "currentColor" : `url(#${gradientId})`} />
      <path d={LOGO_PATHS.p} fill="currentColor" />
    </svg>
  );
}
