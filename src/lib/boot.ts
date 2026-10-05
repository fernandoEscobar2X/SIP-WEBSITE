/**
 * Arranque: corre en <head> antes del primer pintado y marca en <html>
 * - `data-daypart`: "dia" o "noche" según la hora local del visitante (el hero elige su foto);
 * - `data-motion="on"`: hay JavaScript y el visitante no pidió reducir el movimiento (las
 *   entradas animadas parten de su estado inicial sin parpadeo; sin JS todo se ve completo).
 */

export type Daypart = "dia" | "noche";

export const DAY_HOURS = { from: 7, to: 19 } as const;

export function daypartAt(hour: number): Daypart {
  return hour >= DAY_HOURS.from && hour < DAY_HOURS.to ? "dia" : "noche";
}

export const bootScript = `(function(r){var h=new Date().getHours();r.dataset.daypart=h>=${DAY_HOURS.from}&&h<${DAY_HOURS.to}?"dia":"noche";if(!matchMedia("(prefers-reduced-motion: reduce)").matches)r.dataset.motion="on"})(document.documentElement);`;
