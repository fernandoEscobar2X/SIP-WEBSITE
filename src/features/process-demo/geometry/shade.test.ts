import { describe, expect, it } from "vitest";
import { buildPieces, type FittingSet, type Piece } from "./pipes";
import { CONNECT_THRESHOLD, normalizeDegrees, portWorld } from "./ports";
import { portsOf, shadeFlips } from "./shade";

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
const angles = { straight: [90, 90], elbow: [180, 90] } as const;

/** Igual que la prueba de la demo de proceso: en cada junta, los dos lados ven la misma banda. */
function expectContinuous(pieces: readonly Piece[]) {
  const flips = shadeFlips(pieces, fittings);
  const ports = pieces.flatMap((piece, index) =>
    portsOf(piece, fittings).map((port, portIndex) => ({
      index,
      portIndex,
      piece,
      ...portWorld(piece, port),
    })),
  );
  let joints = 0;
  ports.forEach((port, i) => {
    for (const other of ports.slice(i + 1)) {
      if (other.index === port.index) continue;
      if (normalizeDegrees(other.dir - port.dir) !== 180) continue;
      if (Math.hypot(other.x - port.x, other.y - port.y) >= CONNECT_THRESHOLD) continue;
      joints++;
      const angle = (p: typeof port) =>
        normalizeDegrees(
          (angles[p.piece.kind][p.portIndex] ?? 90) + p.piece.rotation + (flips[p.index] ? 180 : 0),
        );
      expect(angle(port), `${port.index} → ${other.index}`).toBe(angle(other));
    }
  });
  expect(joints).toBeGreaterThan(0);
}

describe("bandas del acero continuas (portado de la demo de proceso)", () => {
  it("una tubería dibujada con dos codos mantiene una sola banda", () => {
    const pieces = buildPieces(
      [
        { x: 100, y: 500 },
        { x: 240, y: 500 },
        { x: 240, y: 120 },
        { x: 760, y: 120 },
      ],
      fittings,
    );
    expect(pieces.filter((p) => p.kind === "elbow")).toHaveLength(2);
    expectContinuous(pieces);
  });

  it("armada al revés también queda continua", () => {
    expectContinuous(
      buildPieces(
        [
          { x: 760, y: 120 },
          { x: 240, y: 120 },
          { x: 240, y: 500 },
          { x: 100, y: 500 },
        ],
        fittings,
      ),
    );
  });
});
