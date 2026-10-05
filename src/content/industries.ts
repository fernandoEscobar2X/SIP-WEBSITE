import type { Daypart } from "@/lib/boot";
import type { MediaId } from "@/media";

/**
 * Industrias del hero, en su orden. Nombres y textos viven en los mensajes
 * (`Industries.<id>`); aquí solo la estructura y los medios, tipados contra el manifiesto: una
 * imagen que no existe es un error de compilación, no una imagen rota en producción.
 */

export const heroIndustries = [
  "manufactura",
  "logistica",
  "construccion",
  "agroindustria",
  "energia",
] as const;
export type HeroIndustry = (typeof heroIndustries)[number];

export interface HeroMedia {
  readonly landscape: MediaId;
  readonly portrait: MediaId;
}

export function heroMedia(industry: HeroIndustry, daypart: Daypart): HeroMedia {
  return {
    landscape: `hero-${industry}-${daypart}-h`,
    portrait: `hero-${industry}-${daypart}-v`,
  };
}
