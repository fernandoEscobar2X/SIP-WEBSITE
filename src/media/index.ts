import { mediaManifest } from "./manifest.generated";

/**
 * Acceso tipado a las imágenes. Las rutas llevan el hash de contenido del manifiesto, así que
 * una imagen nueva siempre tiene URL nueva (el CDN las cachea como inmutables).
 */

export type MediaId = keyof typeof mediaManifest;
export type MediaFormat = "avif" | "webp";

export interface MediaEntry {
  readonly width: number;
  readonly height: number;
  readonly widths: readonly number[];
  readonly hash: string;
  /** Color promedio: fondo mientras la imagen carga. */
  readonly color: string;
}

/** Retrato: cuando la ventana es más alta que 3:4 se usa la toma vertical. */
export const PORTRAIT_QUERY = "(max-aspect-ratio: 3/4)";
export const LANDSCAPE_QUERY = "not all and (max-aspect-ratio: 3/4)";

export function media(id: MediaId): MediaEntry {
  return mediaManifest[id];
}

export function mediaUrl(id: MediaId, width: number, format: MediaFormat): string {
  const { hash } = mediaManifest[id];
  return `/media/img/${id}-${hash}/${width}.${format}`;
}

export function mediaSrcSet(id: MediaId, format: MediaFormat): string {
  return mediaManifest[id].widths.map((width) => `${mediaUrl(id, width, format)} ${width}w`).join(", ");
}

/** Variante de respaldo para `<img src>`: la más cercana a 1280 px de ancho. */
export function fallbackWidth(id: MediaId): number {
  const { widths } = mediaManifest[id];
  return widths.reduce((best, width) => (Math.abs(width - 1280) < Math.abs(best - 1280) ? width : best));
}
