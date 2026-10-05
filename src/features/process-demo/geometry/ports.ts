/**
 * Geometría de puertos: dónde quedan los puntos de conexión de una pieza colocada y cómo
 * colocar una pieza nueva para que embone exacto en un puerto.
 *
 * Puertos de conexión de la demo de proceso.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Puerto en coordenadas del lienzo; `dir` es la dirección hacia afuera, en grados (0 = este, 90 = sur). */
export interface Port extends Point {
  readonly dir: number;
}

/** Puerto de una pieza en sus propias fracciones (0–1 de su ancho y alto, sin rotar). */
export interface PortDef {
  readonly fx: number;
  readonly fy: number;
  readonly dir: number;
}

/** Caja de una pieza colocada: esquina superior izquierda, tamaño y rotación alrededor de su centro. */
export interface Placement {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly rotation: number;
}

/** Dos puertos a menos de esta distancia (unidades del lienzo) cuentan como conectados. */
export const CONNECT_THRESHOLD = 14;

export const normalizeDegrees = (degrees: number): number => ((degrees % 360) + 360) % 360;

export function rotatePoint(px: number, py: number, cx: number, cy: number, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = px - cx;
  const dy = py - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** Posición en el lienzo y dirección hacia afuera de un puerto de una pieza colocada. */
export function portWorld(placement: Placement, port: PortDef): Port {
  const center = { x: placement.w / 2, y: placement.h / 2 };
  const rotated = rotatePoint(
    port.fx * placement.w,
    port.fy * placement.h,
    center.x,
    center.y,
    placement.rotation,
  );
  return {
    x: placement.x + rotated.x,
    y: placement.y + rotated.y,
    dir: normalizeDegrees(port.dir + placement.rotation),
  };
}

/** Coloca una pieza de `size` para que su puerto `entry` embone en `source` y se aleje de él. */
export function placeAttached(source: Port, size: { w: number; h: number }, entry: PortDef): Placement {
  const rotation = normalizeDegrees(source.dir + 180 - entry.dir);
  const rotated = rotatePoint(entry.fx * size.w, entry.fy * size.h, size.w / 2, size.h / 2, rotation);
  return { x: source.x - rotated.x, y: source.y - rotated.y, w: size.w, h: size.h, rotation };
}
