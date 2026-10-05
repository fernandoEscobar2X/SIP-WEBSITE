"use client";

/**
 * Script en línea propio que corre una sola vez: mientras el navegador lee el HTML, antes del
 * primer pintado. Patrón de la guía de Next 16 "Preventing flash before hydration".
 *
 * El tipo debe ser idéntico en servidor y cliente: React trata los scripts del head de forma
 * especial y cambiarlo puede impedir la hidratación aunque se suprima el aviso de atributos.
 * En navegación React no ejecuta scripts insertados; cada pieza tiene su efecto de montaje.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type="text/javascript"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: solo recibe scripts propios, generados en el código del sitio
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
