import { afterEach, describe, expect, it, vi } from "vitest";
import { bootScript, DAY_HOURS, daypartAt } from "./boot";

function runBoot(hour: number, reducedMotion: boolean): DOMStringMap {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 30, hour, 30));
  const dataset: DOMStringMap = {};
  const matchMedia = () => ({ matches: reducedMotion });
  new Function("document", "matchMedia", bootScript)({ documentElement: { dataset } }, matchMedia);
  return dataset;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("arranque", () => {
  it("el día va de la hora de inicio (incluida) a la de fin (excluida)", () => {
    expect(daypartAt(DAY_HOURS.from - 1)).toBe("noche");
    expect(daypartAt(DAY_HOURS.from)).toBe("dia");
    expect(daypartAt(DAY_HOURS.to - 1)).toBe("dia");
    expect(daypartAt(DAY_HOURS.to)).toBe("noche");
  });

  it("el script inline decide igual que daypartAt", () => {
    for (let hour = 0; hour < 24; hour++) expect(runBoot(hour, false).daypart).toBe(daypartAt(hour));
  });

  it("solo marca movimiento si el visitante no pidió reducirlo", () => {
    expect(runBoot(12, false).motion).toBe("on");
    expect(runBoot(12, true).motion).toBeUndefined();
  });
});
