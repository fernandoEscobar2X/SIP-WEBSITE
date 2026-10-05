import type { CSSProperties, ReactNode } from "react";
import { Cta } from "@/components/ui/Cta";
import type { ControlMode } from "./hydraulics";
import { LevelTrend } from "./LevelTrend";
import styles from "./process-demo.module.css";

/**
 * La app de supervisión, sin estado: barra del sistema, mando de la bomba, válvula, control de
 * nivel, resumen de operación, tendencia y alarmas. La usan el póster del servidor (sin acciones:
 * los mandos quedan deshabilitados) y la versión interactiva. Dentro de la app solo hay lo que
 * diría un sistema real; el texto comercial vive fuera.
 */

/** Textos de la sección (planos: viajan del servidor al cliente). */
export interface ProcessText {
  readonly diagram: string;
  readonly app: {
    readonly label: string;
    readonly station: string;
    readonly screen: { readonly label: string; readonly edit: string; readonly operate: string };
    readonly clock: string;
    readonly online: string;
    /** Con `{count}`. */
    readonly alarms: { readonly none: string; readonly one: string; readonly other: string };
    /** Vistas de la app en móvil. */
    readonly views: {
      readonly label: string;
      readonly plant: string;
      readonly pump: string;
      readonly trend: string;
      readonly alarms: string;
    };
  };
  readonly edit: { readonly label: string; readonly suggested: string; readonly remove: string };
  readonly pump: {
    readonly title: string;
    readonly running: string;
    readonly stopped: string;
    readonly waiting: string;
    readonly noLine: string;
    readonly mode: string;
    readonly auto: string;
    readonly manual: string;
    readonly start: string;
    readonly stop: string;
  };
  /** `value` con `{value}`. */
  readonly valve: { readonly title: string; readonly value: string };
  readonly control: {
    readonly title: string;
    readonly start: string;
    readonly stop: string;
    readonly value: string;
  };
  readonly summary: {
    readonly title: string;
    readonly volume: string;
    readonly starts: string;
    readonly runtime: string;
  };
  readonly readouts: {
    readonly label: string;
    readonly flow: string;
    readonly pressure: string;
    readonly level: string;
  };
  readonly trend: {
    readonly title: string;
    readonly window: string;
    readonly start: string;
    readonly stop: string;
    /** Con `{value}`. */
    readonly now: string;
  };
  readonly alarms: {
    readonly title: string;
    readonly ack: string;
    readonly acked: string;
    readonly normal: string;
    readonly severity: { readonly alarm: string; readonly warning: string; readonly event: string };
  };
  readonly events: {
    readonly lineOpen: string;
    readonly connected: string;
    readonly removed: string;
    readonly start: string;
    readonly stop: string;
    readonly highLevelStop: string;
    readonly lowLevelStart: string;
    readonly highHighStop: string;
    readonly deadhead: string;
    readonly auto: string;
    readonly manual: string;
  };
  readonly elbow: { readonly one: string; readonly other: string };
  readonly cta: { readonly lead: string; readonly action: string; readonly href: string };
}

export type Screen = "edit" | "operate";
/** En móvil la app muestra una vista a la vez; en desktop, todas. */
export type View = "plant" | "pump" | "trend" | "alarms";
export type Severity = "alarm" | "warning" | "event";
export type Tone = "idle" | "running" | "alert";

export interface LogEntry {
  readonly id: number;
  readonly time: string;
  readonly severity: Severity;
  readonly text: string;
  /** Una alarma tiene estado; un evento solo se registra. */
  readonly status: "active" | "acked" | "normal" | "event";
}

export interface AppState {
  readonly screen: Screen;
  readonly view: View;
  readonly connected: boolean;
  readonly mode: ControlMode;
  readonly running: boolean;
  readonly pumpState: string;
  readonly tone: Tone;
  readonly valve: number;
  readonly setpoints: { readonly start: number; readonly stop: number };
  readonly readings: { readonly flow: string; readonly pressure: string; readonly level: string };
  /** Nivel (0–1) de la muestra más vieja a la más nueva. */
  readonly trend: readonly number[];
  readonly summary: { readonly volume: string; readonly starts: string; readonly runtime: string };
  readonly log: readonly LogEntry[];
  readonly clock: string;
  /** Aviso de la app en móvil (la misma entrada ya está en la bitácora). */
  readonly toast: { readonly id: number; readonly text: string } | null;
}

export interface AppActions {
  readonly onScreen: (screen: Screen) => void;
  readonly onView: (view: View) => void;
  readonly onMode: (mode: ControlMode) => void;
  readonly onRun: () => void;
  readonly onValve: (opening: number) => void;
  readonly onSetpoint: (key: "start" | "stop", value: number) => void;
  readonly onAck: (id: number) => void;
  readonly onSuggested: () => void;
  readonly onRemove: () => void;
}

/** Límites de los setpoints: el paro siempre queda abajo del disparo por nivel muy alto. */
export const SETPOINT_LIMITS = {
  start: { min: 0.1, max: 0.8 },
  stop: { min: 0.3, max: 0.95 },
  gap: 0.1,
} as const;

const pct = (value: number) => Math.round(value * 100);

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange?: (value: T) => void;
}) {
  return (
    <fieldset className={styles.segmented}>
      <legend className="sr-only">{label}</legend>
      {options.map(([option, text]) => (
        <button
          key={option}
          type="button"
          className={styles.segment}
          aria-pressed={option === value}
          disabled={!onChange}
          onClick={onChange ? () => onChange(option) : undefined}
        >
          {text}
        </button>
      ))}
    </fieldset>
  );
}

function Slider({
  label,
  valueText,
  value,
  min = 0,
  max = 100,
  onChange,
}: {
  label: string;
  valueText: string;
  value: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
}) {
  return (
    <label className={styles.slider}>
      <span className={styles.sliderLabel}>
        {label} <span className={styles.sliderValue}>{valueText}</span>
      </span>
      <input
        type="range"
        className={styles.range}
        style={{ "--value": `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
        min={min}
        max={max}
        step={5}
        value={value}
        aria-valuetext={valueText}
        disabled={!onChange}
        readOnly={!onChange}
        // Sin manejador en el póster del servidor: solo la versión interactiva lo pasa.
        onChange={onChange ? (event) => onChange(Number(event.currentTarget.value)) : undefined}
      />
    </label>
  );
}

const alarmCount = (log: readonly LogEntry[]) =>
  log.filter((entry) => entry.status === "active" || entry.status === "acked").length;

function TopBar({ text, state, actions }: { text: ProcessText; state: AppState; actions?: AppActions }) {
  const count = alarmCount(state.log);
  const unacked = state.log.some((entry) => entry.status === "active");
  const alarms = (
    count === 0 ? text.app.alarms.none : count === 1 ? text.app.alarms.one : text.app.alarms.other
  ).replace("{count}", String(count));
  return (
    <div className={styles.bar}>
      <p className={styles.station}>{text.app.station}</p>
      <Segmented
        label={text.app.screen.label}
        options={[
          ["edit", text.app.screen.edit],
          ["operate", text.app.screen.operate],
        ]}
        value={state.screen}
        onChange={actions?.onScreen}
      />
      <p className={styles.barMeta}>
        <span className={styles.clock}>
          <span className="sr-only">{text.app.clock} </span>
          {state.clock}
        </span>
        <span className={styles.online}>
          <span className={styles.dot} data-tone="running" aria-hidden="true" />
          {text.app.online}
        </span>
        <span className={styles.alarmCount} data-tone={count === 0 ? "idle" : unacked ? "alert" : "acked"}>
          <span className={styles.dot} aria-hidden="true" />
          {alarms}
        </span>
      </p>
    </div>
  );
}

function EditBar({ text, state, actions }: { text: ProcessText; state: AppState; actions?: AppActions }) {
  if (state.screen !== "edit") return null;
  return (
    <div className={styles.editBar} role="toolbar" aria-label={text.edit.label}>
      {state.connected ? (
        <button type="button" className={styles.tool} onClick={actions?.onRemove} disabled={!actions}>
          {text.edit.remove}
        </button>
      ) : (
        <button type="button" className={styles.tool} onClick={actions?.onSuggested} disabled={!actions}>
          {text.edit.suggested}
        </button>
      )}
    </div>
  );
}

function PumpCard({ text, state, actions }: { text: ProcessText; state: AppState; actions?: AppActions }) {
  return (
    <section className={styles.card} aria-labelledby="pd-pump-title">
      <div className={styles.cardHead}>
        <h3 id="pd-pump-title" className={styles.cardTitle}>
          {text.pump.title}
        </h3>
        <p className={styles.pumpState} role="status" data-tone={state.tone}>
          <span className={styles.dot} aria-hidden="true" />
          {state.pumpState}
        </p>
      </div>
      <Segmented
        label={text.pump.mode}
        options={[
          ["auto", text.pump.auto],
          ["manual", text.pump.manual],
        ]}
        value={state.mode}
        onChange={actions?.onMode}
      />
      {state.mode === "manual" ? (
        <button
          type="button"
          className={styles.command}
          aria-pressed={state.running}
          disabled={!actions || !state.connected}
          onClick={actions?.onRun}
        >
          {state.running ? text.pump.stop : text.pump.start}
        </button>
      ) : null}
      <Slider
        label={text.valve.title}
        valueText={text.valve.value.replace("{value}", String(pct(state.valve)))}
        value={pct(state.valve)}
        onChange={actions ? (value) => actions.onValve(value / 100) : undefined}
      />
    </section>
  );
}

function ControlCard({ text, state, actions }: { text: ProcessText; state: AppState; actions?: AppActions }) {
  const { start, stop } = state.setpoints;
  const value = (fraction: number) => text.control.value.replace("{value}", String(pct(fraction)));
  return (
    <section className={styles.card} aria-labelledby="pd-control-title">
      <h3 id="pd-control-title" className={styles.cardTitle}>
        {text.control.title}
      </h3>
      <Slider
        label={text.control.stop}
        valueText={value(stop)}
        value={pct(stop)}
        min={pct(SETPOINT_LIMITS.stop.min)}
        max={pct(SETPOINT_LIMITS.stop.max)}
        onChange={actions ? (v) => actions.onSetpoint("stop", v / 100) : undefined}
      />
      <Slider
        label={text.control.start}
        valueText={value(start)}
        value={pct(start)}
        min={pct(SETPOINT_LIMITS.start.min)}
        max={pct(SETPOINT_LIMITS.start.max)}
        onChange={actions ? (v) => actions.onSetpoint("start", v / 100) : undefined}
      />
    </section>
  );
}

function SummaryCard({ text, state }: { text: ProcessText; state: AppState }) {
  const rows = [
    [text.summary.volume, state.summary.volume, "m³"],
    [text.summary.starts, state.summary.starts, ""],
    [text.summary.runtime, state.summary.runtime, "min"],
  ] as const;
  return (
    <section className={styles.card} aria-labelledby="pd-summary-title">
      <h3 id="pd-summary-title" className={styles.cardTitle}>
        {text.summary.title}
      </h3>
      <dl className={styles.metrics}>
        {rows.map(([label, value, unit]) => (
          <div key={label} className={styles.metric}>
            <dt>{label}</dt>
            <dd>
              <span className={styles.metricValue}>{value}</span>
              {unit ? <span className={styles.unit}> {unit}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AlarmList({ text, state, actions }: { text: ProcessText; state: AppState; actions?: AppActions }) {
  return (
    <section
      className={`${styles.card} ${styles.alarms}`}
      aria-labelledby="pd-alarms-title"
      data-panel
      data-view-panel="alarms"
    >
      <h3 id="pd-alarms-title" className={styles.cardTitle}>
        {text.alarms.title}
      </h3>
      {/* data-lenis-prevent: la rueda desplaza la bitácora, no la página. */}
      <ul className={styles.log} aria-live="polite" data-lenis-prevent>
        {state.log.map((entry) => (
          <li
            key={entry.id}
            className={styles.entry}
            data-severity={entry.severity}
            data-status={entry.status}
          >
            <span className={styles.entryMeta}>
              <time className={styles.entryTime}>{entry.time}</time>
              <span className={styles.severity}>{text.alarms.severity[entry.severity]}</span>
            </span>
            <span className={styles.entryText}>{entry.text}</span>
            {entry.status === "active" ? (
              <button
                type="button"
                className={styles.ack}
                disabled={!actions}
                onClick={actions ? () => actions.onAck(entry.id) : undefined}
              >
                {text.alarms.ack}
              </button>
            ) : entry.status === "acked" || entry.status === "normal" ? (
              <span className={styles.entryStatus}>
                {entry.status === "acked" ? text.alarms.acked : text.alarms.normal}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface SupervisionAppProps {
  readonly text: ProcessText;
  readonly state: AppState;
  readonly actions?: AppActions;
  /** El diagrama de proceso (con sus zonas táctiles en la versión interactiva). */
  readonly canvas: ReactNode;
}

export function SupervisionApp({ text, state, actions, canvas }: SupervisionAppProps) {
  return (
    <section
      className={styles.app}
      data-surface="blanco"
      data-screen={state.screen}
      data-view={state.view}
      aria-label={text.app.label}
    >
      <TopBar text={text} state={state} actions={actions} />
      {state.toast ? (
        // La notificación lleva a la bitácora, donde la misma entrada ya se anunció.
        <button
          key={state.toast.id}
          type="button"
          className={styles.toast}
          onClick={actions ? () => actions.onView("alarms") : undefined}
        >
          {state.toast.text}
        </button>
      ) : null}
      <div className={styles.workspace} data-panel data-view-panel="plant">
        <EditBar text={text} state={state} actions={actions} />
        {canvas}
      </div>
      <div className={styles.side} data-panel data-view-panel="pump">
        <PumpCard text={text} state={state} actions={actions} />
        <ControlCard text={text} state={state} actions={actions} />
        <SummaryCard text={text} state={state} />
        <dl className="sr-only" aria-label={text.readouts.label}>
          <div>
            <dt>{text.readouts.flow}</dt>
            <dd data-reading="flow">{state.readings.flow} m³/h</dd>
          </div>
          <div>
            <dt>{text.readouts.pressure}</dt>
            <dd data-reading="pressure">{state.readings.pressure} bar</dd>
          </div>
          <div>
            <dt>{text.readouts.level}</dt>
            <dd data-reading="level">{state.readings.level} %</dd>
          </div>
        </dl>
      </div>
      <section
        className={`${styles.card} ${styles.trendCard}`}
        aria-labelledby="pd-trend-title"
        data-panel
        data-view-panel="trend"
      >
        <div className={styles.cardHead}>
          <h3 id="pd-trend-title" className={styles.cardTitle}>
            {text.trend.title}
          </h3>
          <p className={styles.cardNote}>{text.trend.window}</p>
        </div>
        <LevelTrend
          trend={state.trend}
          setpoints={state.setpoints}
          labels={{ start: text.trend.start, stop: text.trend.stop }}
          summary={text.trend.now.replace("{value}", state.readings.level)}
        />
      </section>
      <AlarmList text={text} state={state} actions={actions} />
      <ViewNav text={text} state={state} actions={actions} />
    </section>
  );
}

/** Navegación de la app en móvil, abajo (zona del pulgar): una vista a la vez. */
function ViewNav({ text, state, actions }: { text: ProcessText; state: AppState; actions?: AppActions }) {
  const count = alarmCount(state.log);
  const views: ReadonlyArray<readonly [View, string]> = [
    ["plant", text.app.views.plant],
    ["pump", text.app.views.pump],
    ["trend", text.app.views.trend],
    ["alarms", text.app.views.alarms],
  ];
  return (
    <nav className={styles.viewNav} aria-label={text.app.views.label}>
      {views.map(([view, label]) => (
        <button
          key={view}
          type="button"
          className={styles.viewButton}
          aria-pressed={view === state.view}
          disabled={!actions}
          onClick={actions ? () => actions.onView(view) : undefined}
        >
          {label}
          {view === "alarms" && count > 0 ? <span className={styles.badge}>{count}</span> : null}
        </button>
      ))}
    </nav>
  );
}

/** El cierre de la sección, fuera de la app: hacia el formulario. */
export function Closing({ text, decided }: { text: ProcessText; decided?: boolean }) {
  return (
    <div className={styles.close} data-decided={decided || undefined}>
      <p className={styles.closeLead}>{text.cta.lead}</p>
      <Cta href={text.cta.href}>{text.cta.action}</Cta>
    </div>
  );
}
