import { describe, expect, it } from "vitest";
import { connect, inletRun, portAt, previewFrom, runThrough, suctionRun } from "./connection";
import { type Layout, pumpPlacement, SCENES } from "./scene";

describe.each(["h", "v"] as Layout[])("tubería de la escena %s", (layout) => {
  const scene = SCENES[layout];
  const { headerPort, tankPort } = scene;
  const pump = pumpPlacement(scene);

  it("la ruta sugerida sale del cabezal y aterriza exacta en la boquilla del tanque", () => {
    const line = connect(scene);
    expect(line.start.x).toBeCloseTo(headerPort.x, 6);
    expect(line.start.y).toBeCloseTo(headerPort.y, 6);
    expect(line.end.x).toBeCloseTo(tankPort.x, 6);
    expect(line.end.y).toBeCloseTo(tankPort.y, 6);
    expect(line.elbows).toBe(layout === "h" ? 2 : 1);
  });

  it("el cabezal sale de la brida de descarga y la succión llega a la de succión", () => {
    expect(scene.header[0]).toEqual({ x: pump.discharge.x, y: pump.discharge.y });
    const suction = suctionRun(scene);
    expect(suction.end.x).toBeCloseTo(pump.suction.x, 6);
    expect(suction.end.y).toBeCloseTo(pump.suction.y, 6);
  });

  it("los tramos fijos cierran exactos en su última esquina", () => {
    for (const corners of [scene.header, scene.outlet]) {
      const run = runThrough(corners);
      const last = corners.at(-1);
      expect(run.end.x).toBeCloseTo(last?.x ?? Number.NaN, 6);
      expect(run.end.y).toBeCloseTo(last?.y ?? Number.NaN, 6);
    }
    expect(inletRun(scene).pieces).toHaveLength(1);
  });

  it("los puertos se toman con el puntero cerca y no lejos", () => {
    expect(portAt(scene, { x: headerPort.x + 10, y: headerPort.y - 10 })).toBe("header");
    expect(portAt(scene, tankPort)).toBe("tank");
    expect(portAt(scene, { x: 0, y: 0 })).toBeNull();
  });

  it("arrastrando hacia el tanque la vista previa sigue al puntero y al llegar se ajusta exacta", () => {
    const loose = previewFrom(scene, "header", { x: tankPort.x - 60, y: tankPort.y + 30 }, null);
    expect(loose.snapped).toBe(false);
    const snapped = previewFrom(scene, "header", { x: tankPort.x + 5, y: tankPort.y + 5 }, loose.bend);
    expect(snapped.snapped).toBe(true);
    expect(snapped.corners.at(-1)).toEqual({ x: tankPort.x, y: tankPort.y });
    // Se arma con el tramo intermedio que se dejó al arrastrar.
    expect(connect(scene, snapped.bend).bend).toBe(loose.bend);
  });

  it("también se conecta arrastrando desde el tanque hacia el cabezal", () => {
    const snapped = previewFrom(scene, "tank", headerPort, null);
    expect(snapped.snapped).toBe(true);
    expect(snapped.corners[0]).toEqual({ x: tankPort.x, y: tankPort.y });
  });
});
