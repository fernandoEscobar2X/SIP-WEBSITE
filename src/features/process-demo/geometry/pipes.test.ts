import { describe, expect, it } from "vitest";
import { piecesToPath } from "./pipe-path";
import { buildPieces, type FittingSet, type Piece, routeMetrics } from "./pipes";
import { portWorld } from "./ports";

const fittings: FittingSet = {
  straight: {
    height: 24,
    minLength: 8,
    ports: [
      { fx: 0, fy: 0.5, dir: 180 },
      { fx: 1, fy: 0.5, dir: 0 },
    ],
  },
  elbow: {
    size: 72,
    ports: [
      { fx: 0.5, fy: 0, dir: 270 },
      { fx: 1, fy: 0.5, dir: 0 },
    ],
  },
};

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

/** Cada junta entre piezas consecutivas coincide en posición y tiene direcciones opuestas. */
function expectContinuous(pieces: readonly Piece[]) {
  const ports = (piece: Piece) =>
    (piece.kind === "straight" ? fittings.straight.ports : fittings.elbow.ports).map((port) =>
      portWorld(piece, port),
    );
  for (let i = 0; i < pieces.length - 1; i++) {
    const joined = ports(pieces[i] as Piece).some((a) =>
      ports(pieces[i + 1] as Piece).some(
        (b) =>
          Math.hypot(a.x - b.x, a.y - b.y) < 1e-6 && Math.abs(((a.dir - b.dir + 360) % 360) - 180) < 1e-6,
      ),
    );
    expect(joined, `junta ${i}–${i + 1}`).toBe(true);
  }
}

describe("ruta → tubería (portado de la demo de proceso)", () => {
  it("las juntas quedan continuas en una ruta con varios giros", () => {
    const pieces = buildPieces(
      [
        { x: 0, y: 0 },
        { x: 240, y: 0 },
        { x: 240, y: 180 },
        { x: 480, y: 180 },
        { x: 480, y: -60 },
      ],
      fittings,
    );
    expectContinuous(pieces);
    expect(pieces.filter((p) => p.kind === "elbow")).toHaveLength(3);
  });

  it("con puerto destino, el final aterriza exacto aunque las esquinas no sean enteras", () => {
    const start = { x: 430.4, y: 320, dir: 0 };
    const end = { x: 690, y: 199.6, dir: 180 };
    const pieces = buildPieces(
      [
        { x: 430.4, y: 320 },
        { x: 480, y: 320 },
        { x: 480, y: 199.6 },
        { x: 690, y: 199.6 },
      ],
      fittings,
      { port: start },
      { port: end },
    );
    expectContinuous(pieces);
    const last = portWorld(pieces.at(-1) as Piece, fittings.straight.ports[1]);
    close(last.x, end.x);
    close(last.y, end.y);
  });

  it("mide la ruta por el eje del tubo y cuenta los codos", () => {
    const pieces = buildPieces(
      [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
        { x: 100, y: 100 },
      ],
      fittings,
    );
    const { length, elbows } = routeMetrics(pieces, fittings);
    expect(elbows).toBe(1);
    close(length, 64 + 64 + (Math.PI / 2) * 36);
  });
});

describe("trazado SVG de la tubería", () => {
  const start = { x: 0, y: 0, dir: 0 };
  const end = { x: 240, y: -180, dir: 180 };
  const pieces = buildPieces(
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: -180 },
      { x: 240, y: -180 },
    ],
    fittings,
    { port: start },
    { port: end },
  );

  it("mide lo mismo que la hidráulica y termina en el puerto destino", () => {
    const path = piecesToPath(pieces, fittings, start);
    close(path.length, routeMetrics(pieces, fittings).length);
    close(path.end.x, end.x);
    close(path.end.y, end.y);
  });

  it("gira con el sentido correcto: derecha→arriba es antihorario y arriba→derecha es horario", () => {
    const path = piecesToPath(pieces, fittings, start);
    const sweeps = [...path.d.matchAll(/A[\d.]+ [\d.]+ 0 0 (\d)/g)].map((m) => m[1]);
    expect(sweeps).toEqual(["0", "1"]);
  });

  it("marca una brida en cada junta interior", () => {
    const path = piecesToPath(pieces, fittings, start);
    expect(path.joints).toHaveLength(pieces.length - 1);
    expect(path.end).toEqual(portWorld(pieces.at(-1) as Piece, fittings.straight.ports[1]));
  });
});
