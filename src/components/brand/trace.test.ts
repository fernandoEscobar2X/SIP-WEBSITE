import { describe, expect, it } from "vitest";
import { traceThrough } from "./trace";

describe("trazo de la marca", () => {
  it("redondea cada esquina con el radio pedido y gira hacia el lado correcto", () => {
    const d = traceThrough(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 80 },
        { x: 200, y: 80 },
      ],
      20,
    );
    // Derecha → abajo es horario (sweep 1); abajo → derecha es antihorario (sweep 0).
    expect(d).toBe("M0 0 L80 0 A20 20 0 0 1 100 20 L100 60 A20 20 0 0 0 120 80 L200 80");
  });

  it("recorta el radio cuando el tramo es corto", () => {
    const d = traceThrough(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 10 },
        { x: 200, y: 10 },
      ],
      20,
    );
    expect(d).toContain("A5 5");
  });

  it("una línea recta no lleva arcos", () => {
    expect(
      traceThrough(
        [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
        ],
        20,
      ),
    ).toBe("M0 0 L50 0");
  });
});
