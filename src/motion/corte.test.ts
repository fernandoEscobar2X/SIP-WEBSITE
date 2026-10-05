import { describe, expect, it } from "vitest";
import { iShape, morphPolygon } from "./corte";
import { tanCorte } from "./tokens";

describe("la forma de la I", () => {
  it("el borde superior va alto · tan(6°) a la derecha del inferior", () => {
    const [topLeft, topRight, bottomRight, bottomLeft] = iShape(0, 0, 100, 200);
    expect(topLeft?.[0]).toBeCloseTo(200 * tanCorte, 9);
    expect(topRight).toEqual([100, 0]);
    expect(bottomRight?.[0]).toBeCloseTo(100 - 200 * tanCorte, 9);
    expect(bottomLeft).toEqual([0, 200]);
  });

  it("interpola entre dos formas y las escribe como polígono", () => {
    const from = iShape(40, 0, 20, 100);
    const to = iShape(0, 0, 100, 100);
    const vertices = (polygon: string) => (polygon.match(/-?[\d.]+(?=px)/g) ?? []).map(Number);
    const expectShape = (polygon: string, shape: ReturnType<typeof iShape>) => {
      const values = vertices(polygon);
      expect(values).toHaveLength(8);
      shape.flat().forEach((value, index) => {
        expect(values[index]).toBeCloseTo(value, 9);
      });
    };
    expectShape(morphPolygon(from, to, 0), from);
    expectShape(morphPolygon(from, to, 1), to);
    expect(morphPolygon(from, to, 0.5)).toMatch(
      /^polygon\((-?[\d.]+px -?[\d.]+px, ){3}-?[\d.]+px -?[\d.]+px\)$/,
    );
  });
});
