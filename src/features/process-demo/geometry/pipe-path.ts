import type { FittingSet, Piece } from "./pipes";
import { type Point, type Port, portWorld } from "./ports";

/**
 * Una cadena de piezas como un solo trazado SVG por el eje del tubo: los tramos son líneas y los
 * codos, arcos de un cuarto de círculo (el giro redondeado del trazo de la marca). Por ese mismo
 * trazado avanza el frente del fluido y corre el flujo.
 */

export interface PipePath {
  readonly d: string;
  /** Largo por el eje, en unidades del lienzo. */
  readonly length: number;
  /** Juntas entre piezas (para dibujar las bridas). */
  readonly joints: readonly Port[];
  readonly end: Point;
}

const round = (value: number) => Math.round(value * 100) / 100;
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < 0.5;

export function piecesToPath(pieces: readonly Piece[], fittings: FittingSet, from: Point): PipePath {
  const radius = fittings.elbow.size / 2;
  let current = from;
  let d = `M${round(from.x)} ${round(from.y)}`;
  let length = 0;
  const joints: Port[] = [];

  for (const piece of pieces) {
    const defs = piece.kind === "straight" ? fittings.straight.ports : fittings.elbow.ports;
    const [a, b] = defs.map((port) => portWorld(piece, port)) as [Port, Port];
    // La entrada es el puerto que toca el punto actual (los codos pueden estar volteados).
    const [entry, exit] = near(a, current) || !near(b, current) ? [a, b] : [b, a];
    if (piece.kind === "straight") {
      d += ` L${round(exit.x)} ${round(exit.y)}`;
      length += piece.w;
    } else {
      const travelIn = (entry.dir + 180) % 360;
      // Girar 90° en sentido horario (en pantalla, y hacia abajo) es el arco con sweep 1.
      const sweep = (exit.dir - travelIn + 360) % 360 === 90 ? 1 : 0;
      d += ` A${radius} ${radius} 0 0 ${sweep} ${round(exit.x)} ${round(exit.y)}`;
      length += (Math.PI / 2) * radius;
    }
    joints.push(exit);
    current = exit;
  }
  return { d, length, joints: joints.slice(0, -1), end: current };
}
