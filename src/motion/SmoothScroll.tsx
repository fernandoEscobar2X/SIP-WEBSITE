"use client";

import Lenis from "lenis";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "./gsap";
import { usePrefersReducedMotion } from "./media";

const LenisContext = createContext<Lenis | null>(null);

/** Instancia de Lenis activa, o null con movimiento reducido / antes de montar. */
export function useLenisInstance(): Lenis | null {
  return useContext(LenisContext);
}

/**
 * Scroll suave con Lenis, conducido por el ticker de GSAP para que
 * ScrollTrigger y Lenis compartan el mismo frame.
 * Con movimiento reducido no se crea: scroll nativo.
 * En táctil Lenis deja el scroll nativo del sistema (syncTouch desactivado por defecto).
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (reduced) return;

    const instance = new Lenis({ autoRaf: false, lerp: 0.11, anchors: true });
    const tick = (time: number) => instance.raf(time * 1000);

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    instance.on("scroll", ScrollTrigger.update);
    setLenis(instance);

    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      setLenis(null);
    };
  }, [reduced]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
