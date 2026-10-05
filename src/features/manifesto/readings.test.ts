import { describe, expect, it } from "vitest";
import { createReadings } from "./readings";

describe("lecturas del manifiesto", () => {
  it("la misma semilla da la misma serie (servidor y navegador coinciden)", () => {
    const a = createReadings({ seed: 11 });
    const b = createReadings({ seed: 11 });
    expect(a.snapshot()).toEqual(b.snapshot());
    for (let i = 0; i < 20; i++) expect(a.step()).toEqual(b.step());
  });

  it("cada paso agrega una lectura y descarta la más vieja", () => {
    const readings = createReadings({ points: 8 });
    const before = readings.snapshot().throughput;
    const after = readings.step().throughput;
    expect(after).toHaveLength(8);
    expect(after.slice(0, 7)).toEqual(before.slice(1));
  });

  it("los valores quedan en 0–100 aun después de muchos pasos", () => {
    const readings = createReadings({ seed: 3 });
    for (let i = 0; i < 500; i++) {
      const { throughput, lines } = readings.step();
      for (const value of [...throughput, ...lines]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });
});
