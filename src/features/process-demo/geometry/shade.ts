import type { FittingSet, Piece } from "./pipes";
import { CONNECT_THRESHOLD, normalizeDegrees, type PortDef, portWorld } from "./ports";

/**
 * Bandas del acero continuas en toda la red. Cada pieza tiene una polaridad de sombreado (normal
 * o invertida) que voltea todos sus degradados juntos, así nunca se arregla una junta abriendo
 * otra dentro de la pieza. La polaridad se resuelve recorriendo el grafo de conexiones, por eso
 * también corrige tramos dibujados al revés o armados desde los dos extremos.
 *
 * Sombreado de la tubería de la demo de proceso.
 */

/** Orientación del eje del degradado en cada puerto (sin rotar). */
const SHADE_ANGLES = { straight: [90, 90], elbow: [180, 90] } as const;

export function portsOf(piece: Piece, fittings: FittingSet): readonly PortDef[] {
  return piece.kind === "straight" ? fittings.straight.ports : fittings.elbow.ports;
}

/** Para cada pieza (por índice), si su sombreado va invertido. */
export function shadeFlips(pieces: readonly Piece[], fittings: FittingSet): boolean[] {
  const ports = pieces.flatMap((piece, index) =>
    portsOf(piece, fittings).map((port, portIndex) => ({
      index,
      key: `${index}:${portIndex}`,
      ...portWorld(piece, port),
      angle: normalizeDegrees((SHADE_ANGLES[piece.kind][portIndex] ?? 90) + piece.rotation),
    })),
  );

  const graph = pieces.map(() => [] as Array<{ to: number; toggle: boolean }>);
  const claimed = new Set<string>();
  for (const port of ports) {
    if (claimed.has(port.key)) continue;
    const neighbor = ports.find(
      (other) =>
        other.index !== port.index &&
        !claimed.has(other.key) &&
        normalizeDegrees(other.dir - port.dir) === 180 &&
        Math.hypot(other.x - port.x, other.y - port.y) < CONNECT_THRESHOLD,
    );
    if (!neighbor) continue;
    const delta = normalizeDegrees(neighbor.angle - port.angle);
    if (delta !== 0 && delta !== 180) continue;
    graph[port.index]?.push({ to: neighbor.index, toggle: delta === 180 });
    graph[neighbor.index]?.push({ to: port.index, toggle: delta === 180 });
    claimed.add(port.key);
    claimed.add(neighbor.key);
  }

  const flipped: Array<boolean | undefined> = pieces.map(() => undefined);
  pieces.forEach((_, start) => {
    if (flipped[start] !== undefined) return;
    flipped[start] = false;
    const queue = [start];
    while (queue.length > 0) {
      const current = queue.shift() as number;
      for (const edge of graph[current] ?? []) {
        if (flipped[edge.to] !== undefined) continue;
        flipped[edge.to] = Boolean(flipped[current]) !== edge.toggle;
        queue.push(edge.to);
      }
    }
  });
  return flipped.map(Boolean);
}
