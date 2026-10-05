import type { CSSProperties } from "react";
import {
  fallbackWidth,
  LANDSCAPE_QUERY,
  type MediaId,
  media,
  mediaSrcSet,
  mediaUrl,
  PORTRAIT_QUERY,
} from "@/media";

export interface PictureProps {
  /** Toma horizontal (y la única, si no hay vertical). */
  readonly landscape: MediaId;
  /** Toma vertical propia para ventanas en retrato (no es un recorte de la horizontal). */
  readonly portrait?: MediaId;
  readonly sizes: string;
  /** Texto alternativo; vacío si la imagen es decorativa. */
  readonly alt: string;
  readonly loading?: "lazy" | "eager";
  readonly fetchPriority?: "high" | "low" | "auto";
  readonly className?: string;
  readonly imgClassName?: string;
}

/**
 * `<picture>` con AVIF y WebP pregenerados, dirección de arte por orientación y medidas
 * intrínsecas (sin CLS). Server Component: no manda JavaScript.
 */
export function Picture({
  landscape,
  portrait,
  sizes,
  alt,
  loading = "lazy",
  fetchPriority = "auto",
  className,
  imgClassName,
}: PictureProps) {
  const entry = media(landscape);
  const vertical = portrait ? media(portrait) : undefined;
  const style = { backgroundColor: entry.color } satisfies CSSProperties;
  return (
    <picture className={className}>
      {portrait && vertical ? (
        <>
          {/* Cada <source> declara sus medidas: la toma vertical reserva su propia proporción. */}
          {(["avif", "webp"] as const).map((format) => (
            <source
              key={format}
              media={PORTRAIT_QUERY}
              type={`image/${format}`}
              srcSet={mediaSrcSet(portrait, format)}
              sizes={sizes}
              width={vertical.width}
              height={vertical.height}
            />
          ))}
          <source
            media={LANDSCAPE_QUERY}
            type="image/avif"
            srcSet={mediaSrcSet(landscape, "avif")}
            sizes={sizes}
          />
          <source
            media={LANDSCAPE_QUERY}
            type="image/webp"
            srcSet={mediaSrcSet(landscape, "webp")}
            sizes={sizes}
          />
        </>
      ) : (
        <>
          <source type="image/avif" srcSet={mediaSrcSet(landscape, "avif")} sizes={sizes} />
          <source type="image/webp" srcSet={mediaSrcSet(landscape, "webp")} sizes={sizes} />
        </>
      )}
      <img
        src={mediaUrl(landscape, fallbackWidth(landscape), "webp")}
        width={entry.width}
        height={entry.height}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        className={imgClassName}
        style={style}
      />
    </picture>
  );
}
