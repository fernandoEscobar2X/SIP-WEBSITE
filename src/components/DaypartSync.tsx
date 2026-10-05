"use client";

import { useLayoutEffect } from "react";
import { daypartAt } from "@/lib/boot";

/** Mantiene la hora local después del arranque, navegación y suspensión del dispositivo. */
export function DaypartSync() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;
    const sync = () => {
      window.clearTimeout(timer);
      const now = new Date();
      root.dataset.daypart = daypartAt(now.getHours());
      if (motion.matches) delete root.dataset.motion;
      else root.dataset.motion = "on";
      // Al minuto exacto: incluye 07:00 y 19:00 y detecta ajustes de reloj/zona del sistema.
      timer = window.setTimeout(sync, 60_000 - (now.getTime() % 60_000));
    };
    sync();
    window.addEventListener("pageshow", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);
  return null;
}
