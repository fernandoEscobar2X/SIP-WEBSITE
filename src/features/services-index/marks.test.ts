import { describe, expect, it } from "vitest";
import { MARK, markShapes, services } from "./marks";

describe("marcas de servicio", () => {
  it("cada servicio tiene una marca y es la misma en cada llamada", () => {
    for (const service of services) {
      const shapes = markShapes(service);
      expect(shapes.length).toBeGreaterThan(0);
      expect(markShapes(service)).toEqual(shapes);
    }
  });

  it("todo queda dentro del lienzo de la marca", () => {
    for (const service of services) {
      for (const shape of markShapes(service)) {
        if (shape.kind === "rect") {
          expect(shape.x).toBeGreaterThanOrEqual(0);
          expect(shape.y).toBeGreaterThanOrEqual(0);
          expect(shape.x + shape.w).toBeLessThanOrEqual(MARK.width + 0.5);
          expect(shape.y + shape.h).toBeLessThanOrEqual(MARK.height + 0.5);
        } else if (shape.kind === "dot") {
          expect(shape.x).toBeGreaterThanOrEqual(0);
          expect(shape.x).toBeLessThanOrEqual(MARK.width);
          expect(shape.y).toBeGreaterThanOrEqual(0);
          expect(shape.y).toBeLessThanOrEqual(MARK.height);
        } else {
          for (const [, x, y] of shape.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)) {
            expect(Number(x)).toBeGreaterThanOrEqual(0);
            expect(Number(x)).toBeLessThanOrEqual(MARK.width);
            expect(Number(y)).toBeGreaterThanOrEqual(0);
            expect(Number(y)).toBeLessThanOrEqual(MARK.height);
          }
        }
      }
    }
  });

  it("no hay dos servicios con la misma marca", () => {
    const signatures = services.map((service) => JSON.stringify(markShapes(service)));
    expect(new Set(signatures).size).toBe(services.length);
  });
});
