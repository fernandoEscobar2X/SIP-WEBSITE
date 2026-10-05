"use client";

import type { RefObject } from "react";
import { gsap, useGSAP } from "./gsap";
import { breakpoints } from "./tokens";

export type MotionConditions = {
  desktop: boolean;
  mobile: boolean;
  reduced: boolean;
};

/** La coreografía puede devolver una limpieza propia (además de la reversión automática). */
type Cleanup = (() => void) | undefined;

/**
 * Punto único para animar una sección.
 * - Todo lo creado queda dentro del scope y se revierte al desmontar
 *   (ScrollTriggers, tweens, listeners): nada queda vivo entre páginas.
 * - Separa desktop / móvil / movimiento reducido con gsap.matchMedia, así cada
 *   sección define una coreografía propia por dispositivo.
 */
export function useSectionMotion(
  scope: RefObject<HTMLElement | null>,
  setup: (conditions: MotionConditions) => Cleanup,
  dependencies: unknown[] = [],
): void {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop: `${breakpoints.desktop} and (prefers-reduced-motion: no-preference)`,
          mobile: `${breakpoints.mobile} and (prefers-reduced-motion: no-preference)`,
          reduced: breakpoints.reducedMotion,
        },
        (context) => {
          const c = context.conditions as MotionConditions;
          return setup({ desktop: c.desktop, mobile: c.mobile, reduced: c.reduced });
        },
      );
      return () => mm.revert();
    },
    { scope, dependencies },
  );
}
