"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  advance,
  initialState,
  type ProcessEvent,
  type ProcessInputs,
  type ProcessState,
  type Readings,
  readings,
} from "./hydraulics";
import { INITIAL_LEVEL, PROCESS, TREND } from "./scene";

/** Lecturas para la vista: se refrescan a ~8 Hz (los visuales se mueven cada cuadro por `onFrame`). */
const UI_INTERVAL_MS = 120;
/** Una pausa más larga que esto (otra pestaña, el depurador) no se simula: se retoma desde ahí. */
const MAX_GAP_S = 1;

export interface SimulationSnapshot extends Readings {
  readonly running: boolean;
  /** Nivel del tanque (0–1), de la muestra más vieja a la más nueva. */
  readonly trend: readonly number[];
  /** Totales de operación, en tiempo de proceso: m³ bombeados y segundos en marcha. */
  readonly pumped: number;
  readonly runtime: number;
}

interface Totals {
  pumped: number;
  runtime: number;
}

interface Options {
  readonly inputs: ProcessInputs;
  /** La sección está a la vista: fuera de pantalla no se simula ni se dibuja. */
  readonly active: boolean;
  /** Cada cuadro, con el estado nuevo, para mover los visuales sin pasar por React. */
  readonly onFrame: (state: ProcessState, dt: number) => void;
  /** Arranques y paros del control (el "dato → cambio operativo"). */
  readonly onEvents: (events: readonly ProcessEvent[], state: ProcessState) => void;
}

const snapshotOf = (state: ProcessState, trend: readonly number[], totals: Totals): SimulationSnapshot => ({
  ...readings(PROCESS, state),
  running: state.running,
  trend,
  pumped: totals.pumped,
  runtime: totals.runtime,
});

/**
 * Corre la hidráulica de la microdemo con requestAnimationFrame. Es la única simulación de la
 * pieza: una función pura (`step`) avanzada en el tiempo, sin motor global.
 */
export function useProcessSimulation({ inputs, active, onFrame, onEvents }: Options) {
  const stateRef = useRef<ProcessState>(initialState(INITIAL_LEVEL));
  // La tendencia arranca llena con el nivel inicial: la gráfica nunca se ve vacía.
  const inputsRef = useRef(inputs);
  const onFrameRef = useRef(onFrame);
  const onEventsRef = useRef(onEvents);
  const trendRef = useRef<number[]>(Array.from({ length: TREND.points }, () => INITIAL_LEVEL));
  const totalsRef = useRef<Totals>({ pumped: 0, runtime: 0 });
  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(() =>
    snapshotOf(stateRef.current, trendRef.current, totalsRef.current),
  );

  useEffect(() => {
    inputsRef.current = inputs;
    onFrameRef.current = onFrame;
    onEventsRef.current = onEvents;
  });

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = performance.now();
    let lastUi = 0;
    let lastTrend = 0;
    const tick = (now: number) => {
      // El tiempo real entre cuadros, integrado en pasos chicos (no depende de los fps); al volver
      // de otra pestaña no hay saltos.
      const elapsed = (now - last) / 1000;
      const dt = elapsed > MAX_GAP_S ? 0 : elapsed;
      last = now;
      const next = advance(PROCESS, stateRef.current, inputsRef.current, dt);
      stateRef.current = next.state;
      const processSeconds = dt * PROCESS.timeScale;
      totalsRef.current.pumped += (next.state.flow * processSeconds) / 3600;
      if (next.state.running) totalsRef.current.runtime += processSeconds;
      if (next.events.length > 0) onEventsRef.current(next.events, next.state);
      onFrameRef.current(next.state, dt);
      if (now - lastTrend > TREND.intervalMs) {
        lastTrend = now;
        trendRef.current = [...trendRef.current, next.state.level].slice(-TREND.points);
      }
      if (now - lastUi > UI_INTERVAL_MS) {
        lastUi = now;
        setSnapshot(snapshotOf(next.state, trendRef.current, totalsRef.current));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  /** Vacía la línea (se quitó el tramo): conserva el nivel del tanque y su tendencia. */
  const drain = useCallback(() => {
    stateRef.current = { ...initialState(stateRef.current.level), armed: false };
    setSnapshot(snapshotOf(stateRef.current, trendRef.current, totalsRef.current));
  }, []);

  return { snapshot, stateRef, drain };
}
