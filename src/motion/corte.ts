import { tanCorte } from "./tokens";

/** Punto [x, y] en píxeles. */
export type Point = readonly [number, number];

/**
 * Paralelogramo de la I del logo: el borde superior va `alto · tan(6°)` a la derecha del inferior.
 * Es la forma de las ventanas, máscaras y barridos de la marca.
 */
export function iShape(x: number, y: number, width: number, height: number): readonly Point[] {
  const lean = height * tanCorte;
  return [
    [x + lean, y],
    [x + width, y],
    [x + width - lean, y + height],
    [x, y + height],
  ];
}

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

/** Interpola dos formas de cuatro vértices y las escribe como `clip-path: polygon(...)`. */
export function morphPolygon(from: readonly Point[], to: readonly Point[], progress: number): string {
  const points = from.map(([x, y], index) => {
    const [endX, endY] = to[index] ?? [x, y];
    return `${mix(x, endX, progress)}px ${mix(y, endY, progress)}px`;
  });
  return `polygon(${points.join(", ")})`;
}
