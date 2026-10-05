import { type PipePath, piecesToPath } from "./geometry/pipe-path";
import { buildPieces, compass, type Piece, routeMetrics } from "./geometry/pipes";
import type { Point, Port } from "./geometry/ports";
import { previewToward, routeBetween } from "./geometry/routing";
import { FITTINGS, PORT_SNAP, pumpPlacement, type Scene } from "./scene";

/**
 * La tubería de la estación: los tramos que ya existen y el que se conecta en modo edición, de
 * puerto a puerto, entre el final del cabezal y la boquilla del tanque.
 */

export interface Run extends PipePath {
  readonly pieces: readonly Piece[];
  readonly start: Port;
  readonly elbows: number;
}

/** Tramo sobre unas esquinas, en el sentido en que se recorren; con `end`, aterriza exacto en él. */
export function runThrough(corners: readonly Point[], end?: Port): Run {
  const [first, second] = corners;
  if (!first || !second) throw new Error("Un tramo necesita al menos dos esquinas");
  const start = { x: first.x, y: first.y, dir: compass(first, second) };
  const pieces = buildPieces(corners, FITTINGS, { port: start }, end ? { port: end } : null);
  return {
    ...piecesToPath(pieces, FITTINGS, start),
    pieces,
    start,
    elbows: routeMetrics(pieces, FITTINGS).elbows,
  };
}

/** Succión: desde dentro de la cisterna hasta la brida de succión de la bomba. */
export function suctionRun(scene: Scene): Run {
  const { suction } = pumpPlacement(scene);
  return runThrough([{ x: suction.x, y: suction.y + scene.suctionDepth }, suction]);
}

/** Boquilla de entrada: del puerto del tanque a su pared. */
export function inletRun(scene: Scene): Run {
  const port = scene.tankPort;
  const wall = port.dir === 180 ? scene.tank.x : scene.tank.x + scene.tank.w;
  return runThrough([port, { x: wall, y: port.y }]);
}

export interface Connection extends Run {
  /** Posición del tramo intermedio (en una Z), para volver a armar la misma ruta. */
  readonly bend: number | null;
}

/** El tramo pendiente, del cabezal al tanque, con el tramo intermedio en `bend`. */
export function connect(scene: Scene, bend: number | null = scene.suggestedBend): Connection {
  const corners = routeBetween(scene.headerPort, scene.tankPort, FITTINGS, bend ?? undefined);
  // La tubería entra a la boquilla avanzando en contra de su dirección hacia afuera.
  const target = { ...scene.tankPort, dir: (scene.tankPort.dir + 180) % 360 };
  const run = runThrough(corners, target);
  const middle = corners[1];
  return {
    ...run,
    bend: corners.length === 4 && middle ? (scene.headerPort.dir % 180 === 0 ? middle.x : middle.y) : null,
  };
}

export type End = "header" | "tank";

export const portOf = (scene: Scene, end: End): Port =>
  end === "header" ? scene.headerPort : scene.tankPort;

/** Puerto del tramo pendiente bajo el puntero, si lo hay. */
export function portAt(scene: Scene, point: Point): End | null {
  for (const end of ["header", "tank"] as const) {
    const port = portOf(scene, end);
    if (Math.hypot(port.x - point.x, port.y - point.y) < PORT_SNAP) return end;
  }
  return null;
}

export interface Preview {
  readonly corners: readonly Point[];
  /** El puntero llegó al otro puerto: al soltar, se conecta. */
  readonly snapped: boolean;
  readonly bend: number | null;
}

/**
 * Lo que se dibuja mientras se arrastra desde un puerto: la ruta hacia el puntero y, al llegar al
 * otro puerto, la ruta final con el tramo intermedio donde se dejó (`lastBend`).
 */
export function previewFrom(scene: Scene, from: End, pointer: Point, lastBend: number | null): Preview {
  const start = portOf(scene, from);
  const other = portOf(scene, from === "header" ? "tank" : "header");
  if (Math.hypot(other.x - pointer.x, other.y - pointer.y) < PORT_SNAP) {
    const bend = lastBend ?? scene.suggestedBend;
    const corners = routeBetween(scene.headerPort, scene.tankPort, FITTINGS, bend ?? undefined);
    return { corners: from === "header" ? corners : [...corners].reverse(), snapped: true, bend };
  }
  const { corners, bend } = previewToward(start, other, pointer, FITTINGS);
  return { corners, snapped: false, bend };
}
