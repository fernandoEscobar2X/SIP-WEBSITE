"use client";

/**
 * Script en línea propio que corre una sola vez: mientras el navegador lee el HTML, antes del
 * primer pintado. Patrón de la guía de Next 16 "Preventing flash before hydration".
 *
 * En el cliente se vuelve `text/plain`. Un `<script>` que React inserta en el cliente nunca se
 * ejecuta, y en desarrollo React avisa cuando lo crea; pasa, por ejemplo, al cambiar de idioma,
 * porque el layout raíz se vuelve a montar. Con `text/plain` es un bloque de datos: no hay aviso
 * y el comportamiento es el mismo. `suppressHydrationWarning` acepta que el tipo del HTML (el que
 * ya se ejecutó) difiera del que renderiza el cliente.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      // biome-ignore lint/security/noDangerouslySetInnerHtml: solo recibe scripts propios, generados en el código del sitio
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
