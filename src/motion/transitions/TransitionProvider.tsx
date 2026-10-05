"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { gsap } from "../gsap";
import { prefersReducedMotion } from "../media";
import { useLenisInstance } from "../SmoothScroll";
import { duration, ease } from "../tokens";
import styles from "./transition.module.css";

type TransitionApi = { navigate: (href: string) => void };

const TransitionContext = createContext<TransitionApi | null>(null);

export function usePageTransition(): TransitionApi {
  const ctx = useContext(TransitionContext);
  if (!ctx) throw new Error("usePageTransition debe usarse dentro de <TransitionProvider>");
  return ctx;
}

/** Si la navegación nunca llega (error de red), la cortina se retira sola. */
const SAFETY_TIMEOUT_MS = 6000;

/** Se emite en `window` cuando la página nueva queda a la vista (la cortina terminó de salir). */
export const PAGE_REVEALED_EVENT = "sip:page-revealed";

/**
 * Transiciones de página propias sobre el router oficial de Next.
 * Salida: la cortina entra cubriendo la página → router.push.
 * Entrada: al cambiar el pathname, scroll arriba y la cortina sale.
 */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenisInstance();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pending = useRef<string | null>(null);
  const safety = useRef<number | undefined>(undefined);

  const reveal = useCallback(() => {
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return;
    window.clearTimeout(safety.current);
    gsap.to(panel, {
      xPercent: -110,
      duration: duration.slow * 0.75,
      ease: ease.out.name,
      delay: 0.05,
      onComplete: () => {
        gsap.set(overlay, { visibility: "hidden" });
        gsap.set(panel, { xPercent: 110 });
        window.dispatchEvent(new Event(PAGE_REVEALED_EVENT));
      },
    });
  }, []);

  const navigate = useCallback(
    (href: string) => {
      const target = new URL(href, window.location.href);
      if (target.pathname === window.location.pathname) {
        lenis?.scrollTo(target.hash || 0);
        return;
      }
      if (prefersReducedMotion() || !overlayRef.current || !panelRef.current) {
        router.push(href);
        return;
      }
      if (pending.current) return;
      pending.current = target.pathname;

      gsap.set(overlayRef.current, { visibility: "visible" });
      gsap.fromTo(
        panelRef.current,
        { xPercent: 110 },
        {
          xPercent: 0,
          duration: duration.slow * 0.6,
          ease: ease.in.name,
          onComplete: () => router.push(href),
        },
      );
      safety.current = window.setTimeout(() => {
        pending.current = null;
        reveal();
      }, SAFETY_TIMEOUT_MS);
    },
    [lenis, reveal, router],
  );

  useEffect(() => {
    if (!pending.current || pending.current !== pathname) return;
    pending.current = null;
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    reveal();
  }, [pathname, lenis, reveal]);

  const api = useMemo(() => ({ navigate }), [navigate]);

  return (
    <TransitionContext.Provider value={api}>
      {children}
      <div ref={overlayRef} className={styles.overlay} aria-hidden="true">
        <div ref={panelRef} className={styles.panel}>
          <div className={styles.edge} />
        </div>
      </div>
    </TransitionContext.Provider>
  );
}
