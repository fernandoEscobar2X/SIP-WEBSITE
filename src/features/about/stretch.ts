/**
 * Canal de velocidad de Visión y Misión (desktop): el ancho de la palabra (eje `wdth` de Hubot)
 * responde a la velocidad del scroll. En reposo la palabra tiene su ancho de diseño; al desplazarse
 * rápido se condensa, como una pieza que se comprime con el movimiento, y vuelve al soltarse.
 *
 * Solo condensa (nunca pasa del ancho de reposo): se suma al ensamble de cada letra como una
 * diferencia negativa (`--kick`) sin pelear con él.
 */
export const STRETCH = {
  /** Ancho mínimo, cerca del límite del eje (75 %). */
  min: 76,
  /** Velocidad (px/s) a la que la palabra llega a su ancho mínimo. */
  fullSpeed: 2800,
} as const;

/** Ancho (en %) para una velocidad de scroll en px/s, en cualquier dirección. */
export function stretchFor(velocity: number, rest: number, range = STRETCH): number {
  const speed = Math.min(1, Math.abs(velocity) / range.fullSpeed);
  // Salida suave: responde desde velocidades bajas y se satura sin golpe.
  const eased = speed * (2 - speed);
  return rest - (rest - Math.min(range.min, rest)) * eased;
}
