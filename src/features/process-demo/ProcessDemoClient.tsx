"use client";

import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from "react";
import { traceThrough } from "@/components/brand/trace";
import { site } from "@/lib/site";
import { gsap } from "@/motion/gsap";
import { useMediaQuery, usePrefersReducedMotion } from "@/motion/media";
import { breakpoints, ease } from "@/motion/tokens";
import { useSectionMotion } from "@/motion/useSectionMotion";
import {
  type AppActions,
  type AppState,
  Closing,
  type LogEntry,
  type ProcessText,
  type Screen,
  SETPOINT_LIMITS,
  type Severity,
  SupervisionApp,
  type Tone,
  type View,
} from "./app";
import { connect, type End, portOf, previewFrom } from "./connection";
import { Diagram, FIXED, leverPivot, OpenPort, surfaceY } from "./diagram";
import type { Point } from "./geometry/ports";
import { routeBetween } from "./geometry/routing";
import type { ControlMode, ProcessEvent, ProcessState } from "./hydraulics";
import styles from "./process-demo.module.css";
import { FITTINGS, type Layout, PROCESS, pumpPlacement, SCENES } from "./scene";
import { useProcessSimulation } from "./useProcessSimulation";

/** Velocidades visuales a caudal máximo, en unidades del lienzo por segundo. */
const FILL_SPEED = 900;
const FLOW_SPEED = 260;
const BEAM_SPEED = 40;
/** Entradas visibles en la bitácora y cuánto dura el aviso en móvil. */
const LOG_ENTRIES = 6;
const TOAST_MS = 4200;
/** Radio de los giros en la vista previa: el mismo del codo. */
const TURN = FITTINGS.elbow.size / 2;
/** Por debajo de este desplazamiento, tocar la palanca la abre o la cierra de golpe. */
const TAP_SLOP = 4;
const DEADHEAD = 0.02;

type AlarmKey = "lineOpen" | "deadhead" | "highHigh";

interface Entry extends LogEntry {
  readonly key?: AlarmKey;
}

interface Drag {
  readonly pointerId: number;
  readonly from: End;
  readonly pointer: Point;
  readonly bend: number | null;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const toPercent = (value: number, total: number) => `${(value / total) * 100}%`;
const percentText = (template: string, value: number) =>
  template.replace("{level}", String(Math.round(value * 100)));

/**
 * La app de supervisión, operable: se conecta el tramo pendiente en modo edición, se opera la
 * bomba y la válvula, se mueven los puntos de control y se reconocen las alarmas. La geometría y
 * la hidráulica son módulos puros con pruebas; aquí solo se orquesta la interacción.
 */
export function ProcessDemoClient({ text, locale }: { text: ProcessText; locale: string }) {
  const desktop = useMediaQuery(breakpoints.desktop);
  const layout: Layout = desktop ? "h" : "v";
  const reduced = usePrefersReducedMotion();
  const scene = SCENES[layout];
  const fixed = FIXED[layout];
  const { width, height } = scene.viewBox;

  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const leverRef = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const visuals = useRef({ front: 0, phase: 0, outlet: 0, beam: 0 });
  const entryId = useRef(1);

  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: site.timeZone,
  });
  const now = () => time.format(new Date());

  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [hint, setHint] = useState(0);
  const [screen, setScreen] = useState<Screen>("edit");
  const [view, setView] = useState<View>("plant");
  const [connected, setConnected] = useState(false);
  const [bend, setBend] = useState<number | null>(SCENES.h.suggestedBend);
  const [mode, setMode] = useState<ControlMode>("auto");
  const [run, setRun] = useState(false);
  const [valve, setValve] = useState(1);
  const [setpoints, setSetpoints] = useState({ start: PROCESS.tank.start, stop: PROCESS.tank.stop });
  const [dragging, setDragging] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [starts, setStarts] = useState(0);
  const [decided, setDecided] = useState(false);
  const [clock, setClock] = useState(now);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [log, setLog] = useState<Entry[]>(() => [
    { id: 0, time: now(), severity: "alarm", text: text.events.lineOpen, status: "active", key: "lineOpen" },
  ]);

  const connection = connected ? connect(scene, layout === "h" ? bend : null) : null;
  const pipeLength =
    fixed.suction.length + fixed.header.length + (connection ? connection.length + fixed.inlet.length : 0);

  // ---------- Bitácora y alarmas ----------
  const push = (severity: Severity, entryText: string, key?: AlarmKey, notify = false) => {
    const entry: Entry = {
      id: entryId.current++,
      time: now(),
      severity,
      text: entryText,
      status: key ? "active" : "event",
      key,
    };
    setLog((current) => [entry, ...current].slice(0, LOG_ENTRIES));
    if (notify) setToast({ id: entry.id, text: entryText });
  };
  const raise = (key: AlarmKey, severity: Severity, entryText: string) => {
    const open = log.some(
      (entry) => entry.key === key && (entry.status === "active" || entry.status === "acked"),
    );
    if (!open) push(severity, entryText, key, true);
  };
  const clear = (key: AlarmKey) =>
    setLog((current) =>
      current.map((entry) =>
        entry.key === key && (entry.status === "active" || entry.status === "acked")
          ? { ...entry, status: "normal" }
          : entry,
      ),
    );

  const eventText: Record<ProcessEvent["kind"], (state: ProcessState) => string> = {
    start: () => text.events.start,
    stop: () => text.events.stop,
    "high-level-stop": (state) => percentText(text.events.highLevelStop, state.level),
    "low-level-start": (state) => percentText(text.events.lowLevelStart, state.level),
    "high-high-stop": (state) => percentText(text.events.highHighStop, state.level),
  };
  const onEvents = (events: readonly ProcessEvent[], state: ProcessState) => {
    for (const event of events) {
      if (event.kind === "high-high-stop") {
        // El disparo suelta el mando del operador: hace falta un arranque nuevo.
        setRun(false);
        raise("highHigh", "alarm", eventText[event.kind](state));
        continue;
      }
      const control = event.kind === "high-level-stop" || event.kind === "low-level-start";
      push("event", eventText[event.kind](state), undefined, control);
      if (event.kind === "start" || event.kind === "low-level-start") setStarts((count) => count + 1);
      if (control) setDecided(true);
    }
  };

  // ---------- Simulación y visuales por cuadro ----------
  // Directo al DOM, sin re-render: frente y flujo del agua, nivel del tanque y pulsos del radar.
  const onFrame = (state: ProcessState, dt: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const v = visuals.current;
    const speed = state.flow / PROCESS.pump.maxFlow;
    v.front = Math.min(pipeLength, v.front + speed * FILL_SPEED * dt);
    if (!reduced) {
      v.phase += speed * FLOW_SPEED * dt;
      v.outlet += (PROCESS.demand / PROCESS.pump.maxFlow) * FLOW_SPEED * dt;
      v.beam += BEAM_SPEED * dt;
    }
    for (const path of svg.querySelectorAll<SVGPathElement>("[data-fluid]")) {
      const start = Number(path.dataset.start);
      const length = Number(path.dataset.length);
      const filled = clamp01((v.front - start) / length);
      path.style.strokeDashoffset = String(1 - filled);
      const flow = path.nextElementSibling as SVGPathElement | null;
      if (flow?.dataset.flow !== undefined) {
        flow.style.strokeDashoffset = String(-(v.phase - start));
        flow.style.opacity = filled >= 1 && speed > 0.02 ? "1" : "0";
      }
    }
    const draining = state.level > 0.02;
    svg
      .querySelector<SVGPathElement>("[data-outlet]")
      ?.style.setProperty("stroke-dashoffset", draining ? "0" : "1");
    const outletFlow = svg.querySelector<SVGPathElement>("[data-outlet-flow]");
    if (outletFlow) {
      outletFlow.style.strokeDashoffset = String(-v.outlet);
      outletFlow.style.opacity = draining ? "1" : "0";
    }
    const surface = surfaceY(scene, state.level);
    svg
      .querySelector<SVGGElement>("[data-liquid]")
      ?.style.setProperty("transform", `translateY(${surface}px)`);
    const beam = svg.querySelector<SVGLineElement>("[data-beam]");
    if (beam) {
      beam.setAttribute("y2", String(surface));
      beam.style.strokeDashoffset = String(-v.beam);
    }
  };

  const { snapshot, drain } = useProcessSimulation({
    inputs: {
      connected,
      mode,
      run,
      valve,
      setpoints,
      length: pipeLength * scene.metersPerUnit,
      elbows: fixed.elbows + (connection?.elbows ?? 0),
    },
    active: visible,
    onFrame,
    onEvents,
  });

  const deadhead = snapshot.running && valve <= DEADHEAD;
  // Alarmas que dependen del estado, no de un evento: se levantan y se normalizan solas.
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo cuando cambia la condición
  useEffect(() => {
    if (deadhead) raise("deadhead", "warning", text.events.deadhead);
    else clear("deadhead");
  }, [deadhead]);
  const levelOk = snapshot.level < setpoints.stop;
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo cuando cambia la condición
  useEffect(() => {
    if (levelOk) clear("highHigh");
  }, [levelOk]);

  // La sección a la vista: simulación, reloj y entrada.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = Boolean(entry?.isIntersecting);
        setVisible(isVisible);
        if (isVisible) setEntered(true);
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: el formato no cambia mientras corre
  useEffect(() => {
    if (!visible) return;
    const ticker = window.setInterval(() => setClock(now()), 1000);
    return () => window.clearInterval(ticker);
  }, [visible]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Entrada: el trazo de la marca recorre la línea y la tubería se arma a su alrededor, pieza por
  // pieza; el equipo y los paneles de la app llegan con ella. Si la sección ya está a la vista
  // (recarga a media página) no se arma: nada debe desaparecer frente al visitante.
  useSectionMotion(
    rootRef,
    ({ desktop: isDesktop, mobile }) => {
      const root = rootRef.current;
      const svg = svgRef.current;
      if (!root || !svg || !(isDesktop || mobile)) return undefined;
      if (root.getBoundingClientRect().top < window.innerHeight * 0.85) return undefined;
      const equipment = svg.querySelectorAll("[data-enter='equipment']");
      const traces = svg.querySelectorAll("[data-trace]");
      const pieces = svg.querySelectorAll("[data-run]:not([data-fresh]) [data-piece]");
      const flanges = svg.querySelectorAll("[data-flanges] > :not([data-fresh]) [data-flange]");
      const water = svg.querySelectorAll("[data-outlet-water]");
      const panels = root.querySelectorAll("[data-panel]");
      gsap
        .timeline({ scrollTrigger: { trigger: root, start: "top 80%" } })
        .from(panels, { opacity: 0, y: 18, duration: 0.8, stagger: 0.06, ease: ease.out.name }, 0)
        // Relativo: los grupos ya llevan su propio `translate` y un `y` absoluto los movería de lugar.
        .from(equipment, { opacity: 0, y: "+=14", duration: 0.7, stagger: 0.04, ease: ease.out.name }, 0.2)
        .fromTo(
          traces,
          { strokeDashoffset: 1, opacity: 1 },
          { strokeDashoffset: 0, duration: 1.1, stagger: 0.2, ease: ease.inOut.name },
          0.3,
        )
        .from(
          pieces,
          {
            opacity: 0,
            scale: 0.86,
            transformOrigin: "50% 50%",
            duration: 0.5,
            stagger: 0.05,
            ease: ease.out.name,
          },
          0.9,
        )
        .from(
          flanges,
          {
            opacity: 0,
            scale: 0.4,
            transformOrigin: "50% 50%",
            duration: 0.3,
            stagger: 0.03,
            ease: ease.out.name,
          },
          1.15,
        )
        .from(water, { opacity: 0, duration: 0.5, ease: ease.out.name }, 1.3)
        .to(traces, { opacity: 0, duration: 0.5, ease: ease.out.name }, 1.8);
      return undefined;
    },
    [layout],
  );

  // ---------- Coordenadas ----------
  const toScene = (event: { clientX: number; clientY: number }): Point | null => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };

  // ---------- Conectar de puerto a puerto ----------
  const finishConnection = (nextBend: number | null) => {
    const line = connect(scene, nextBend);
    setConnected(true);
    if (layout === "h") setBend(line.bend);
    setScreen("operate");
    clear("lineOpen");
    const elbows = fixed.elbows + line.elbows;
    const plural = new Intl.PluralRules(locale).select(elbows) === "one" ? "one" : "other";
    const meters = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
      (fixed.suction.length + fixed.header.length + line.length + fixed.inlet.length) * scene.metersPerUnit,
    );
    push(
      "event",
      text.events.connected
        .replace("{length}", meters)
        .replace("{elbows}", String(elbows))
        .replace("{elbowWord}", text.elbow[plural]),
    );
  };

  // El arrastre empieza en la zona táctil de un puerto (HTML: Chrome ignora `touch-action`
  // dentro de un SVG) y el SVG captura el puntero para recibir el resto del gesto.
  const onPortPointerDown = (event: PointerEvent<HTMLSpanElement>, from: End) => {
    const svg = svgRef.current;
    if (connected || !event.isPrimary || !svg) return;
    event.preventDefault();
    svg.setPointerCapture(event.pointerId);
    const port = portOf(scene, from);
    setDrag({ pointerId: event.pointerId, from, pointer: port, bend: null });
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = toScene(event);
    if (!point) return;
    const preview = previewFrom(scene, drag.from, point, drag.bend);
    setDrag({ ...drag, pointer: point, bend: preview.snapped ? drag.bend : preview.bend });
  };

  const endDrag = (event: PointerEvent<SVGSVGElement>, accept: boolean) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const preview = previewFrom(scene, drag.from, drag.pointer, drag.bend);
    setDrag(null);
    if (accept && preview.snapped) finishConnection(preview.bend);
    else setHint((value) => value + 1);
  };

  // ---------- Válvula: la palanca se arrastra o se toca ----------
  const leverOpening = (event: { clientX: number; clientY: number }) => {
    const point = toScene(event);
    if (!point) return null;
    const pivot = leverPivot(scene);
    const { open, closed } = scene.valve;
    const angle = (Math.atan2(point.y - pivot.y, point.x - pivot.x) * 180) / Math.PI;
    return Math.round(clamp01((angle - closed) / (open - closed)) * 20) / 20;
  };

  const onLeverPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (!event.isPrimary) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    leverRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  };

  const onLeverPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const current = leverRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < TAP_SLOP) return;
    current.moved = true;
    setDragging(true);
    const opening = leverOpening(event);
    if (opening !== null) setValve(opening);
  };

  const onLeverPointerUp = (event: PointerEvent<HTMLSpanElement>) => {
    const current = leverRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    leverRef.current = null;
    setDragging(false);
    if (!current.moved) setValve((value) => (value > 0.5 ? 0 : 1));
  };

  // ---------- Mandos de la app ----------
  const actions: AppActions = {
    onScreen: setScreen,
    onView: (next) => {
      setView(next);
      setToast(null);
    },
    onMode: (next) => {
      if (next === mode) return;
      // Cambio sin golpe: en manual, el mando arranca en el estado en que la bomba ya está.
      if (next === "manual") setRun(snapshot.running);
      setMode(next);
      push("event", next === "auto" ? text.events.auto : text.events.manual);
    },
    onRun: () => setRun(!snapshot.running),
    onValve: setValve,
    onSetpoint: (key, value) =>
      setSetpoints((current) => {
        const { gap } = SETPOINT_LIMITS;
        // El arranque siempre queda abajo del paro, con un margen.
        return key === "start"
          ? { start: Math.min(value, current.stop - gap), stop: current.stop }
          : { start: current.start, stop: Math.max(value, current.start + gap) };
      }),
    onAck: (id) =>
      setLog((current) =>
        current.map((entry) =>
          entry.id === id && entry.status === "active" ? { ...entry, status: "acked" } : entry,
        ),
      ),
    onSuggested: () => finishConnection(scene.suggestedBend),
    onRemove: () => {
      setConnected(false);
      setRun(false);
      drain();
      visuals.current.front = Math.min(visuals.current.front, fixed.suction.length + fixed.header.length);
      push("event", text.events.removed);
      push("alarm", text.events.lineOpen, "lineOpen", true);
    },
  };

  // ---------- Vista ----------
  const number = (digits: number) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const tone: Tone = !connected ? "idle" : deadhead ? "alert" : snapshot.running ? "running" : "idle";
  const pumpState = !connected
    ? text.pump.noLine
    : snapshot.running
      ? text.pump.running
      : mode === "auto"
        ? text.pump.waiting
        : text.pump.stopped;
  const runtime = Math.floor(snapshot.runtime);
  const state: AppState = {
    screen,
    view,
    connected,
    mode,
    running: snapshot.running,
    pumpState,
    tone,
    valve,
    setpoints,
    readings: {
      flow: number(1).format(snapshot.flow),
      pressure: number(2).format(snapshot.pressure),
      level: number(0).format(snapshot.level * 100),
    },
    trend: snapshot.trend,
    summary: {
      volume: number(2).format(snapshot.pumped),
      starts: String(starts),
      runtime: `${Math.floor(runtime / 60)}:${String(runtime % 60).padStart(2, "0")}`,
    },
    log,
    clock,
    toast,
  };

  const editing = screen === "edit" && !connected;
  const preview = drag ? previewFrom(scene, drag.from, drag.pointer, drag.bend) : null;
  // Afordancia sin palabras: el trazo de la marca recorre la ruta sugerida.
  const ghost = traceThrough(
    routeBetween(scene.headerPort, scene.tankPort, FITTINGS, scene.suggestedBend ?? undefined),
    TURN,
  );
  const showGhost = entered && !reduced && editing && !drag;

  // Tramos por donde corre el agua, en orden: succión, cabezal, el tramo conectado y la boquilla.
  const segments: Array<{ key: string; d: string; start: number; length: number }> = [];
  let reached = 0;
  for (const [index, path] of [
    fixed.suction,
    fixed.header,
    ...(connection ? [connection, fixed.inlet] : []),
  ].entries()) {
    segments.push({
      key: `${layout}-${index}-${path.d.length}`,
      d: path.d,
      start: reached,
      length: path.length,
    });
    reached += path.length;
  }

  const fluid = (
    <>
      {[fixed.suction, fixed.header, fixed.outlet].map((path) => (
        <path key={path.d} className={styles.trace} d={path.d} pathLength={1} data-trace />
      ))}
      <g data-outlet-water>
        <path className={styles.fluid} d={fixed.outlet.d} pathLength={1} data-outlet />
        <path className={styles.flow} d={fixed.outlet.d} data-outlet-flow />
      </g>
      {segments.map((segment) => (
        <g key={segment.key}>
          <path
            className={styles.fluid}
            d={segment.d}
            pathLength={1}
            data-fluid
            data-start={segment.start}
            data-length={segment.length}
          />
          <path className={styles.flow} d={segment.d} data-flow />
        </g>
      ))}
    </>
  );

  const overlay = editing ? (
    <>
      {showGhost ? <path key={`ghost-${hint}`} className={styles.ghost} d={ghost} pathLength={1} /> : null}
      {preview ? (
        <>
          <path className={styles.previewPipe} d={traceThrough(preview.corners, TURN)} />
          <path className={styles.previewCore} d={traceThrough(preview.corners, TURN)} />
        </>
      ) : null}
      {(["header", "tank"] as const).map((end) => {
        const port = portOf(scene, end);
        return (
          <OpenPort
            key={end}
            x={port.x}
            y={port.y}
            target={Boolean(preview?.snapped) && drag?.from !== end}
          />
        );
      })}
    </>
  ) : null;

  const pump = pumpPlacement(scene);
  const pivot = leverPivot(scene);
  const canvas = (
    <div
      className={styles.canvas}
      style={{ "--aspect": width / height } as CSSProperties}
      data-dragging={dragging || undefined}
    >
      <Diagram
        layout={layout}
        label={text.diagram}
        opening={valve}
        connection={connection ? { key: `line-${bend}`, pieces: connection.pieces, fresh: true } : null}
        readings={state.readings}
        tone={tone}
        className={styles.svg}
        svgRef={svgRef}
        fluid={fluid}
        overlay={overlay}
        svgProps={{
          onPointerMove,
          onPointerUp: (event) => endDrag(event, true),
          onPointerCancel: (event) => endDrag(event, false),
        }}
      />
      {mode === "manual" && connected ? (
        <span
          className={styles.pumpHit}
          style={{
            left: toPercent(pump.x, width),
            top: toPercent(pump.y, height),
            width: toPercent(pump.w, width),
            height: toPercent(pump.h, height),
          }}
          onClick={actions.onRun}
          aria-hidden="true"
        />
      ) : null}
      <span
        className={styles.leverHit}
        style={{ left: toPercent(pivot.x, width), top: toPercent(pivot.y, height) }}
        onPointerDown={onLeverPointerDown}
        onPointerMove={onLeverPointerMove}
        onPointerUp={onLeverPointerUp}
        onPointerCancel={onLeverPointerUp}
        aria-hidden="true"
      />
      {editing
        ? (["header", "tank"] as const).map((end) => {
            const port = portOf(scene, end);
            return (
              <span
                key={end}
                className={styles.portHit}
                style={{ left: toPercent(port.x, width), top: toPercent(port.y, height) }}
                onPointerDown={(event) => onPortPointerDown(event, end)}
                data-port={end}
                aria-hidden="true"
              />
            );
          })
        : null}
    </div>
  );

  return (
    <div ref={rootRef} className={styles.stage} data-entered={entered || undefined}>
      <SupervisionApp text={text} state={state} actions={actions} canvas={canvas} />
      <Closing text={text} decided={decided} />
    </div>
  );
}
