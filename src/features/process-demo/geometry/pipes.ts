import { type Placement, type Point, type Port, type PortDef, placeAttached, portWorld } from "./ports";

/**
 * De una ruta ortogonal a una tubería real: tramos rectos y codos de 90° que embonan exacto entre
 * sí (`placeAttached`, la misma matemática del acople manual) y cuyo final aterriza exacto en el
 * puerto destino.
 *
 * Construcción de piezas de tubería para la demo de proceso,
 * con el mismo comportamiento verificado por sus pruebas.
 */

export type Compass = 0 | 90 | 180 | 270;

export interface FittingSet {
  readonly straight: {
    /** Alto de la caja del tramo (el ancho es su largo). */
    readonly height: number;
    readonly minLength: number;
    readonly ports: readonly [PortDef, PortDef];
  };
  readonly elbow: {
    /** Lado de la caja cuadrada del codo. */
    readonly size: number;
    readonly ports: readonly [PortDef, PortDef];
  };
}

export interface Piece extends Placement {
  readonly kind: "straight" | "elbow";
}

export interface Anchor {
  readonly port: Port;
}

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** Dirección de brújula de `a` a `b` en coordenadas de pantalla (y crece hacia abajo). */
export function compass(a: Point, b: Point): Compass {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 0 : 180;
  return dy >= 0 ? 90 : 270;
}

/** Distancia con signo de `from` a `to` medida a lo largo de `dir`. */
export function lengthAlong(dir: number, from: Point, to: Point): number {
  switch (dir) {
    case 0:
      return to.x - from.x;
    case 180:
      return from.x - to.x;
    case 90:
      return to.y - from.y;
    case 270:
      return from.y - to.y;
    default:
      return distance(from, to);
  }
}

/**
 * Encadena tramos y codos sobre una lista de esquinas ortogonales. Una esquina dibujada es el
 * cruce de los ejes de los dos tubos: el tramo se detiene donde empieza el codo, así la tubería
 * construida coincide con la vista previa.
 *
 * `start`: si el trazo empezó junto a un puerto abierto, la tubería sale de ese puerto.
 * `end`: si terminó junto a otro, el final aterriza exacto en él, en ambos ejes.
 */
export function buildPieces(
  corners: readonly Point[],
  fittings: FittingSet,
  start: Anchor | null = null,
  end: Anchor | null = null,
): Piece[] {
  if (corners.length < 2) return [];
  const { straight, elbow } = fittings;
  const directions: Compass[] = [];
  for (let i = 0; i < corners.length - 1; i++)
    directions.push(compass(corners[i] as Point, corners[i + 1] as Point));

  const pieces: Piece[] = [];
  const firstCorner = corners[0] as Point;
  let source: Port = start?.port ?? { x: firstCorner.x, y: firstCorner.y, dir: directions[0] as Compass };

  directions.forEach((direction, i) => {
    const interior = i < directions.length - 1;
    const inset = interior ? elbow.size / 2 : 0;
    const corner = corners[i + 1] as Point;
    const stop = {
      x: corner.x - (direction === 0 ? inset : direction === 180 ? -inset : 0),
      y: corner.y - (direction === 90 ? inset : direction === 270 ? -inset : 0),
    };
    const length = Math.max(straight.minLength, Math.round(lengthAlong(direction, source, stop)));
    const run = placeAttached(source, { w: length, h: straight.height }, straight.ports[0]);
    pieces.push({ kind: "straight", ...run });
    source = portWorld(run, straight.ports[1]);
    if (!interior) return;

    // Los puertos del codo están a 90°: cuál es la entrada depende de hacia dónde gira la ruta.
    const turnTo = directions[i + 1];
    let fitting = placeAttached(source, { w: elbow.size, h: elbow.size }, elbow.ports[0]);
    let exit = portWorld(fitting, elbow.ports[1]);
    if (exit.dir !== turnTo) {
      fitting = placeAttached(source, { w: elbow.size, h: elbow.size }, elbow.ports[1]);
      exit = portWorld(fitting, elbow.ports[0]);
    }
    pieces.push({ kind: "elbow", ...fitting });
    source = exit;
  });

  // Ajusta el último tramo que corre sobre `axis` y desplaza todo lo que viene después, para
  // que el extremo real termine exactamente en `target` sin abrir ninguna junta.
  const correctAxis = (axis: "x" | "y", target: number) => {
    const lastPiece = pieces[pieces.length - 1] as Piece;
    const delta = target - portWorld(lastPiece, straight.ports[1])[axis];
    if (Math.abs(delta) < 0.01) return;
    for (let i = pieces.length - 1; i >= 0; i--) {
      const piece = pieces[i] as Piece;
      if (piece.kind !== "straight") continue;
      const oldExit = portWorld(piece, straight.ports[1]);
      const travelAxis = oldExit.dir === 0 || oldExit.dir === 180 ? "x" : "y";
      if (travelAxis !== axis) continue;
      const sign = oldExit.dir === 0 || oldExit.dir === 90 ? 1 : -1;
      const newLength = piece.w + delta * sign;
      if (newLength < straight.minLength) continue;
      const entry = portWorld(piece, straight.ports[0]);
      const resized = placeAttached(
        { x: entry.x, y: entry.y, dir: (entry.dir + 180) % 360 },
        { w: newLength, h: piece.h },
        straight.ports[0],
      );
      const newExit = portWorld(resized, straight.ports[1]);
      const shift = { x: newExit.x - oldExit.x, y: newExit.y - oldExit.y };
      pieces[i] = { kind: "straight", ...resized };
      for (let j = i + 1; j < pieces.length; j++) {
        const later = pieces[j] as Piece;
        pieces[j] = { ...later, x: later.x + shift.x, y: later.y + shift.y };
      }
      return;
    }
  };

  if (end) {
    correctAxis("x", end.port.x);
    correctAxis("y", end.port.y);
  } else {
    // Sin puerto destino: solo se respeta la nivelación que el propio dibujo implicó.
    const lastCorner = corners[corners.length - 1] as Point;
    const begin = portWorld(pieces[0] as Piece, straight.ports[0]);
    if (Math.abs(firstCorner.x - lastCorner.x) < 0.01) correctAxis("x", begin.x);
    if (Math.abs(firstCorner.y - lastCorner.y) < 0.01) correctAxis("y", begin.y);
  }
  return pieces;
}

/** Largo de la ruta por el eje del tubo y número de codos (para la hidráulica). */
export function routeMetrics(
  pieces: readonly Piece[],
  fittings: FittingSet,
): { length: number; elbows: number } {
  // En el codo, el eje recorre un cuarto de círculo de radio igual a medio lado de la caja.
  const elbowLength = (Math.PI / 2) * (fittings.elbow.size / 2);
  let length = 0;
  let elbows = 0;
  for (const piece of pieces) {
    if (piece.kind === "elbow") {
      elbows += 1;
      length += elbowLength;
    } else {
      length += piece.w;
    }
  }
  return { length, elbows };
}
