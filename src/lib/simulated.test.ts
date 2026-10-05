import { describe, expect, it } from "vitest";
import { datatype, seededRandom } from "./simulated";

describe("datos simulados", () => {
  it("la misma semilla da la misma serie, en [0, 1)", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const series = Array.from({ length: 50 }, () => a());
    expect(series).toEqual(Array.from({ length: 50 }, () => b()));
    expect(series.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(seededRandom(43)()).not.toBe(series[0]);
  });

  it("escribe las gráficas en la sintaxis de Datatype", () => {
    expect(datatype.line([1, 2, 3])).toBe("{l:1,2,3}");
    expect(datatype.bars([4, 5])).toBe("{b:4,5}");
  });
});
