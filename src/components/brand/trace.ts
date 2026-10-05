/**
 * El trazo de la marca como trazado SVG: una polilínea ortogonal con giros redondeados de radio
 * constante, como la S y la P del logo (y como una tubería). Conecta cosas; nunca es un rail.
 */

export interface TracePoint {
  readonly x: number;
  readonly y: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * `d` que pasa por `corners` con cada esquina redondeada. El radio se recorta si un tramo es más
 * corto que dos radios, para que el giro nunca se salga del tramo.
 */
export function traceThrough(corners: readonly TracePoint[], radius: number): string {
  const [first] = corners;
  if (!first) return "";
  let d = `M${round(first.x)} ${round(first.y)}`;
  for (let i = 1; i < corners.length - 1; i++) {
    const previous = corners[i - 1] as TracePoint;
    const corner = corners[i] as TracePoint;
    const next = corners[i + 1] as TracePoint;
    const inLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    const r = Math.min(radius, inLength / 2, outLength / 2);
    const into = {
      x: corner.x - ((corner.x - previous.x) / inLength) * r,
      y: corner.y - ((corner.y - previous.y) / inLength) * r,
    };
    const out = {
      x: corner.x + ((next.x - corner.x) / outLength) * r,
      y: corner.y + ((next.y - corner.y) / outLength) * r,
    };
    // Sentido del giro por el producto cruz (en pantalla, y crece hacia abajo).
    const cross =
      (corner.x - previous.x) * (next.y - corner.y) - (corner.y - previous.y) * (next.x - corner.x);
    d += ` L${round(into.x)} ${round(into.y)} A${round(r)} ${round(r)} 0 0 ${cross > 0 ? 1 : 0} ${round(out.x)} ${round(out.y)}`;
  }
  const last = corners[corners.length - 1] as TracePoint;
  if (corners.length > 1) d += ` L${round(last.x)} ${round(last.y)}`;
  return d;
}
