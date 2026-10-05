import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * IPs locales de esta máquina (IPv4, sin loopback). Next bloquea los recursos de desarrollo a
 * orígenes que no son localhost; permitir solo estas direcciones deja probar desde el celular
 * en la misma red (http://<ip>:3000) sin abrir el servidor de desarrollo a cualquier origen.
 * Solo aplica a `next dev`.
 */
function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net !== undefined && net.family === "IPv4" && !net.internal)
    .map((net) => (net as { address: string }).address);
}

const nextConfig: NextConfig = {
  // Sitio 100 % estático: se sirve desde el CDN de Netlify sin runtime de servidor.
  output: "export",
  reactCompiler: true,
  poweredByHeader: false,
  allowedDevOrigins: lanAddresses(),
  // El indicador de desarrollo tapa el dock móvil (y cada esquina tiene interfaz del sitio).
  // Los errores de compilación y de ejecución se siguen mostrando.
  devIndicators: false,
  // Sin configuración de imágenes a propósito: las variantes AVIF/WebP se pregeneran
  // (scripts/media.mjs) y se sirven con <Picture>. Usar next/image hace fallar el export.
};

export default withNextIntl(nextConfig);
