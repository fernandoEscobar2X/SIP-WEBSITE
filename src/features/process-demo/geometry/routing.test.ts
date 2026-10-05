import { describe, expect, it } from "vitest";
import { buildPieces, type FittingSet, type Piece } from "./pipes";
import { portWorld } from "./ports";
import { previewToward, routeBetween, routeShape } from "./routing";

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

// Cabezal que mira a la derecha y boquilla de tanque que mira a la izquierda, más arriba.
const header = { x: 690, y: 200, dir: 0 };
const nozzle = { x: 842, y: 90, dir: 180 };

describe("ruta entre puertos", () => {
  it("puertos que se miran forman una Z con su rango de tramo intermedio", () => {
    expect(routeShape(header, nozzle, fittings)).toEqual({ kind: "z", axis: "x", min: 734, max: 798 });
  });

  it("el tramo intermedio sigue lo pedido dentro de su rango y se recorta fuera de él", () => {
    expect(routeBetween(header, nozzle, fittings, 760)).toEqual([
      { x: 690, y: 200 },
      { x: 760, y: 200 },
      { x: 760, y: 90 },
      { x: 842, y: 90 },
    ]);
    expect(routeBetween(header, nozzle, fittings, 2000)[1]?.x).toBe(798);
    expect(routeBetween(header, nozzle, fittings)[1]?.x).toBe(766);
  });

  it("puertos perpendiculares forman una L con el codo en el cruce de sus ejes", () => {
    const up = { x: 300, y: 250, dir: 270 };
    const right = { x: 188, y: 90, dir: 0 };
    expect(routeBetween(up, right, fittings)).toEqual([
      { x: 300, y: 250 },
      { x: 300, y: 90 },
      { x: 188, y: 90 },
    ]);
  });

  it("sin espacio para los codos no hay ruta", () => {
    expect(routeShape(header, { x: 760, y: 190, dir: 180 }, fittings)).toBeNull();
    expect(() => routeBetween(header, { x: 700, y: 120, dir: 180 }, fittings)).toThrow();
  });

  it("la tubería armada sobre la ruta sale de un puerto y aterriza exacta en el otro", () => {
    const pieces = buildPieces(
      routeBetween(header, nozzle, fittings, 750),
      fittings,
      { port: header },
      {
        port: nozzle,
      },
    );
    const first = portWorld(pieces[0] as Piece, fittings.straight.ports[0]);
    const last = portWorld(pieces.at(-1) as Piece, fittings.straight.ports[1]);
    expect(first.x).toBeCloseTo(header.x, 6);
    expect(first.y).toBeCloseTo(header.y, 6);
    expect(last.x).toBeCloseTo(nozzle.x, 6);
    expect(last.y).toBeCloseTo(nozzle.y, 6);
    expect(pieces.filter((piece) => piece.kind === "elbow")).toHaveLength(2);
  });
});

describe("vista previa al arrastrar", () => {
  it("el tramo intermedio sigue al puntero y la ruta llega hasta él", () => {
    const { corners, bend } = previewToward(header, nozzle, { x: 780, y: 120 }, fittings);
    expect(bend).toBe(780);
    expect(corners).toEqual([
      { x: 690, y: 200 },
      { x: 780, y: 200 },
      { x: 780, y: 120 },
    ]);
  });

  it("pasado el tramo intermedio, la ruta sigue de frente hasta el puntero", () => {
    const { corners, bend } = previewToward(header, nozzle, { x: 830, y: 95 }, fittings);
    expect(bend).toBe(798);
    expect(corners.at(-1)).toEqual({ x: 830, y: 95 });
  });

  it("desde el otro puerto también funciona (se puede conectar en cualquier sentido)", () => {
    const { bend } = previewToward(nozzle, header, { x: 740, y: 180 }, fittings);
    expect(bend).toBe(740);
  });
});
