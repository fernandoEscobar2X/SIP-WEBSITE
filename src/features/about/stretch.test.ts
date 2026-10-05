import { describe, expect, it } from "vitest";
import { STRETCH, stretchFor } from "./stretch";

describe("ancho cinético según la velocidad del scroll", () => {
  it("en reposo la palabra tiene su ancho de diseño", () => {
    expect(stretchFor(0, 112)).toBe(112);
  });

  it("a toda velocidad llega al mínimo y no lo rebasa", () => {
    expect(stretchFor(STRETCH.fullSpeed, 112)).toBe(STRETCH.min);
    expect(stretchFor(STRETCH.fullSpeed * 5, 112)).toBe(STRETCH.min);
  });

  it("responde igual hacia arriba que hacia abajo", () => {
    expect(stretchFor(-900, 112)).toBe(stretchFor(900, 112));
  });

  it("se condensa más cuanto más rápido, sin pasar nunca del reposo", () => {
    const widths = [0, 300, 900, 1800, 2800].map((v) => stretchFor(v, 112));
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeLessThan(widths[i - 1] as number);
    expect(Math.max(...widths)).toBe(112);
  });

  it("si el reposo ya es más angosto que el mínimo, no cambia", () => {
    expect(stretchFor(2800, 70)).toBe(70);
  });
});
