"use client";

import { useSyncExternalStore } from "react";
import { breakpoints } from "./tokens";

function subscribe(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
}

/** Suscripción a una media query compatible con renderizado en servidor. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(breakpoints.reducedMotion);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(breakpoints.reducedMotion).matches;
}
