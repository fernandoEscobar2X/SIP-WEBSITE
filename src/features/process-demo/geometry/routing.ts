import type { FittingSet } from "./pipes";
import type { Point, Port } from "./ports";

/**
 * Ruta ortogonal exacta entre dos puertos, como un conector en el modo edición de un sistema: la
 * tubería sale de una brida en su dirección y entra a la otra de frente.
 *
 * - **Z:** los puertos se miran (por ejemplo, uno a la derecha y otro a la izquierda): la ruta sube
 *   o baja por un tramo intermedio cuya posición (`bend`) elige quien conecta, dentro del rango
 *   donde caben los dos codos y su tramo mínimo.
 * - **L:** los puertos son perpendiculares: un solo codo en el cruce de sus ejes.
 */

export type RouteShape =
  | {
      readonly kind: "z";
      /** Eje del tramo intermedio: `x` si sube o baja, `y` si corre de lado. */
      readonly axis: "x" | "y";
      readonly min: number;
      readonly max: number;
    }
  | { readonly kind: "l"; readonly corner: Point };

const horizontal = (dir: number) => dir === 0 || dir === 180;
/** +1 si la dirección avanza hacia coordenadas mayores en su eje. */
const sign = (dir: number) => (dir === 0 || dir === 90 ? 1 : -1);

/** Forma de la ruta entre dos puertos, o `null` si no hay una ruta válida con estas piezas. */
export function routeShape(start: Port, end: Port, fittings: FittingSet): RouteShape | null {
  const reach = fittings.elbow.size / 2 + fittings.straight.minLength;
  const facing = (start.dir + 180) % 360 === end.dir;

  if (facing) {
    // Los puertos se miran: Z con el tramo intermedio sobre el eje de avance.
    const axis = horizontal(start.dir) ? "x" : "y";
    const s = sign(start.dir);
    const from = start[axis] + s * reach;
    const to = end[axis] - s * reach;
    const [min, max] = s > 0 ? [from, to] : [to, from];
    const across = axis === "x" ? "y" : "x";
    // Dos codos necesitan su lado completo en el eje transversal.
    if (
      min > max ||
      Math.abs(end[across] - start[across]) < fittings.elbow.size + fittings.straight.minLength
    )
      return null;
    return { kind: "z", axis, min, max };
  }

  if (horizontal(start.dir) === horizontal(end.dir)) return null;
  // Perpendiculares: el codo va en el cruce de los ejes de los dos puertos.
  const corner = horizontal(start.dir) ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
  const leaves = horizontal(start.dir)
    ? sign(start.dir) * (corner.x - start.x)
    : sign(start.dir) * (corner.y - start.y);
  // La ruta entra al puerto destino avanzando en contra de su dirección hacia afuera.
  const arrives = horizontal(end.dir)
    ? sign(end.dir) * (corner.x - end.x)
    : sign(end.dir) * (corner.y - end.y);
  if (leaves < reach || arrives < reach) return null;
  return { kind: "l", corner };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Esquinas de la ruta; en una Z, el tramo intermedio va en `bend` (por defecto, a la mitad). */
export function routeBetween(start: Port, end: Port, fittings: FittingSet, bend?: number): Point[] {
  const shape = routeShape(start, end, fittings);
  if (!shape) throw new Error("No hay ruta ortogonal entre estos puertos");
  const a = { x: start.x, y: start.y };
  const b = { x: end.x, y: end.y };
  if (shape.kind === "l") return [a, shape.corner, b];
  const at = clamp(bend ?? (shape.min + shape.max) / 2, shape.min, shape.max);
  return shape.axis === "x"
    ? [a, { x: at, y: a.y }, { x: at, y: b.y }, b]
    : [a, { x: a.x, y: at }, { x: b.x, y: at }, b];
}

/**
 * Vista previa mientras se arrastra desde `start` hacia el puntero, todavía sin llegar al otro
 * puerto: la ruta que se formaría, con el tramo intermedio siguiendo al puntero dentro de su rango.
 * Devuelve las esquinas y la posición elegida del tramo intermedio (en una Z).
 */
export function previewToward(
  start: Port,
  end: Port,
  pointer: Point,
  fittings: FittingSet,
): { corners: Point[]; bend: number | null } {
  const shape = routeShape(start, end, fittings);
  const a = { x: start.x, y: start.y };
  if (!shape) return { corners: [a, pointer], bend: null };
  if (shape.kind === "l") {
    const corner = horizontal(start.dir) ? { x: pointer.x, y: a.y } : { x: a.x, y: pointer.y };
    return { corners: [a, corner, pointer], bend: null };
  }
  const across = shape.axis === "x" ? "y" : "x";
  const bend = clamp(pointer[shape.axis], shape.min, shape.max);
  const riserStart = shape.axis === "x" ? { x: bend, y: a.y } : { x: a.x, y: bend };
  const riserEnd = shape.axis === "x" ? { x: bend, y: pointer.y } : { x: pointer.x, y: bend };
  // El último tramo solo existe si el puntero ya pasó el tramo intermedio en la dirección de avance.
  const beyond = sign(start.dir) * (pointer[shape.axis] - bend) > 0;
  const corners = beyond ? [a, riserStart, riserEnd, pointer] : [a, riserStart, riserEnd];
  return {
    corners: corners.filter(
      (c, i) =>
        i === 0 || c[across] !== corners[i - 1]?.[across] || c[shape.axis] !== corners[i - 1]?.[shape.axis],
    ),
    bend,
  };
}
