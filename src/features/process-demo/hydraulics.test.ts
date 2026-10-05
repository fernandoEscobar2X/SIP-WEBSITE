import { describe, expect, it } from "vitest";
import {
  advance,
  initialState,
  operatingFlow,
  type ProcessEvent,
  type ProcessInputs,
  type ProcessParams,
  type ProcessState,
  pumpHead,
  readings,
  staticHead,
  step,
} from "./hydraulics";

const params: ProcessParams = {
  pump: { shutoffHead: 32, maxFlow: 24 },
  losses: { perMeter: 0.0012, perElbow: 0.004, valveOpen: 0.004 },
  elevation: 12,
  tank: { height: 3, area: 0.2, start: 0.4, stop: 0.9, highHigh: 0.97 },
  demand: 6,
  responseTime: 0.8,
  timeScale: 8,
};

const route: ProcessInputs = {
  connected: true,
  mode: "auto",
  run: false,
  valve: 1,
  length: 20,
  elbows: 2,
};
const manual: ProcessInputs = { ...route, mode: "manual", run: true };

/** Corre el proceso `seconds` segundos en pasos de 1/60 s y junta los eventos. */
function run(state: ProcessState, inputs: ProcessInputs, seconds: number) {
  const events: ProcessEvent[] = [];
  let current = state;
  for (let i = 0; i < seconds * 60; i++) {
    const next = step(params, current, inputs, 1 / 60);
    current = next.state;
    events.push(...next.events);
  }
  return { state: current, events };
}

describe("punto de operación", () => {
  it("cae donde la carga de la bomba iguala a la del sistema", () => {
    const flow = operatingFlow(params, route, 0.5, true);
    const system =
      staticHead(params, 0.5) +
      (params.losses.perMeter * route.length +
        params.losses.perElbow * route.elbows +
        params.losses.valveOpen) *
        flow ** 2;
    expect(pumpHead(params, flow)).toBeCloseTo(system, 6);
    expect(flow).toBeGreaterThan(10);
  });

  it("una ruta más larga y con más codos da menos caudal", () => {
    const direct = operatingFlow(params, route, 0.5, true);
    const winding = operatingFlow(params, { ...route, length: 40, elbows: 8 }, 0.5, true);
    expect(winding).toBeLessThan(direct * 0.85);
  });

  it("cerrar la válvula baja el caudal hasta cero", () => {
    const open = operatingFlow(params, route, 0.5, true);
    const throttled = operatingFlow(params, { ...route, valve: 0.15 }, 0.5, true);
    expect(throttled).toBeLessThan(open / 2);
    expect(operatingFlow(params, { ...route, valve: 0 }, 0.5, true)).toBe(0);
  });

  it("sin tubería conectada no hay caudal aunque la bomba gire", () => {
    expect(operatingFlow(params, { ...route, connected: false }, 0.5, true)).toBe(0);
  });

  it("si el desnivel supera la carga al cierre, la bomba no sube agua", () => {
    expect(operatingFlow({ ...params, elevation: 40 }, route, 0.5, true)).toBe(0);
  });
});

describe("instrumentos y control de nivel", () => {
  it("al arrancar, el caudal sube y la presión de descarga baja desde el cierre", () => {
    const { state } = run(initialState(0.5), route, 4);
    const r = readings(params, state);
    expect(state.running).toBe(true);
    expect(r.flow).toBeCloseTo(operatingFlow(params, route, state.level, true), 0);
    expect(r.pressure).toBeLessThan(params.pump.shutoffHead * 0.0981);
    expect(r.pressure).toBeGreaterThan(staticHead(params, state.level) * 0.0981);
  });

  it("con la válvula cerrada, el sensor marca caudal cero y la presión sube al cierre de la bomba", () => {
    const flowing = run(initialState(0.5), route, 3).state;
    const closed = run(flowing, { ...route, valve: 0 }, 6).state;
    const r = readings(params, closed);
    expect(r.flow).toBe(0);
    expect(r.pressure).toBeCloseTo(params.pump.shutoffHead * 0.0981, 2);
  });

  it("el control para la bomba al nivel alto y la vuelve a arrancar al nivel bajo", () => {
    const { events, state } = run(initialState(0.55), route, 90);
    const kinds = events.map((e) => e.kind);
    expect(kinds[0]).toBe("start");
    expect(kinds).toContain("high-level-stop");
    expect(kinds).toContain("low-level-start");
    expect(state.level).toBeGreaterThanOrEqual(params.tank.start - 0.05);
    expect(state.level).toBeLessThanOrEqual(1);
  });

  it("el paro del operador detiene la bomba y la línea conserva su columna", () => {
    const flowing = run(initialState(0.5), manual, 3).state;
    const stopped = run(flowing, { ...manual, run: false }, 4);
    expect(stopped.events.map((e) => e.kind)).toEqual(["stop"]);
    expect(stopped.state.flow).toBe(0);
    expect(readings(params, stopped.state).pressure).toBeCloseTo(
      staticHead(params, stopped.state.level) * 0.0981,
      6,
    );
    // Un arranque nuevo con la línea ya llena vuelve a girar.
    expect(run(stopped.state, manual, 1).events.map((e) => e.kind)).toEqual(["start"]);
  });

  it("en manual el nivel no detiene la bomba hasta el disparo por nivel muy alto", () => {
    const { events, state } = run(initialState(0.55), manual, 60);
    const kinds = events.map((e) => e.kind);
    expect(kinds).not.toContain("high-level-stop");
    expect(kinds).toContain("high-high-stop");
    expect(state.running).toBe(false);
    // Disparada, no vuelve a arrancar sola aunque el mando siga activo.
    const later = run(state, manual, 20);
    expect(later.events).toEqual([]);
  });

  it("pasar de manual a automático con la bomba girando no la detiene ni la rearranca", () => {
    const flowing = run(initialState(0.5), manual, 2).state;
    const { events } = run(flowing, route, 1);
    expect(events).toEqual([]);
  });

  it("el control obedece los puntos de arranque y paro que fija el operador", () => {
    const { events } = run(initialState(0.55), { ...route, setpoints: { start: 0.5, stop: 0.7 } }, 60);
    const stop = events.find((e) => e.kind === "high-level-stop");
    const start = events.find((e) => e.kind === "low-level-start");
    expect(stop?.kind === "high-level-stop" && stop.level).toBeCloseTo(0.7, 1);
    expect(start?.kind === "low-level-start" && start.level).toBeCloseTo(0.5, 1);
  });

  it("sin línea conectada la bomba no arranca en ningún modo", () => {
    expect(run(initialState(0.5), { ...route, connected: false }, 2).events).toEqual([]);
    expect(run(initialState(0.5), { ...manual, connected: false }, 2).events).toEqual([]);
  });

  it("es determinista y nunca produce valores inválidos", () => {
    const a = run(initialState(0.3), { ...route, valve: 0.4 }, 30).state;
    const b = run(initialState(0.3), { ...route, valve: 0.4 }, 30).state;
    expect(a).toEqual(b);
    for (const value of Object.values(readings(params, a))) expect(Number.isFinite(value)).toBe(true);
  });
});

describe("integración independiente de los cuadros por segundo", () => {
  /** El mismo lapso entregado en cuadros de `fps`. */
  function at(fps: number, seconds: number) {
    let state = initialState(0.55);
    const events: ProcessEvent[] = [];
    for (let i = 0; i < seconds * fps; i++) {
      const next = advance(params, state, route, 1 / fps);
      state = next.state;
      events.push(...next.events);
    }
    return { state, events };
  }

  it("a 120, 60 y 4 cuadros por segundo el proceso llega al mismo estado", () => {
    const smooth = at(120, 30);
    for (const fps of [60, 4]) {
      const other = at(fps, 30);
      expect(other.state.level).toBeCloseTo(smooth.state.level, 2);
      expect(other.state.flow).toBeCloseTo(smooth.state.flow, 1);
      expect(other.events.map((e) => e.kind)).toEqual(smooth.events.map((e) => e.kind));
    }
  });

  it("un cuadro largo no salta el punto de paro: el control para cerca del 90 %", () => {
    const { events } = at(2, 40);
    const stop = events.find((event) => event.kind === "high-level-stop");
    expect(stop?.kind === "high-level-stop" && stop.level).toBeLessThan(0.91);
  });
});
