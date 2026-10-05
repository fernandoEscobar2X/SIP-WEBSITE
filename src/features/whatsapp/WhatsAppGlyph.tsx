/**
 * Ícono propio de mensaje (no es de librería ni del sistema): globo de trazo
 * constante con esquinas redondeadas, como la S y la P del logo, y dentro la I
 * inclinada de SIP como cursor de escritura. El globo usa currentColor; la I
 * toma --glyph-i (azul de marca según la superficie).
 */
export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path
        d="M10 6H22A5 5 0 0 1 27 11V15A5 5 0 0 1 22 20H14L9.3 25.5L10 20A5 5 0 0 1 5 15V11A5 5 0 0 1 10 6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path data-glyph-i d="M17.6 9.2L16.6 16.8" stroke="var(--glyph-i)" strokeWidth="2.8" />
    </svg>
  );
}
