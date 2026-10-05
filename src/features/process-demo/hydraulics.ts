/**
 * Hidráulica de la microdemo: una bomba centrífuga sube agua de una cisterna a un tanque elevado
 * por la tubería que dibuja el visitante, con una válvula en la línea y un control de nivel.
 *
 * Modelo pequeño pero honesto:
 * - curva de la bomba: H = H₀ − k_b·Q²;
 * - curva del sistema: carga estática + (k_largo·L + k_codo·codos + k_válvula(apertura))·Q²;
 * - el caudal es el cruce de las dos curvas, alcanzado con una respuesta de primer orden;
 * - el nivel del tanque integra caudal de entrada menos consumo.
 * La geometría dibujada importa: una ruta larga y con más codos da menos caudal.
 *
 * Unidades: carga en m, caudal en m³/h, tiempo en s. Funciones puras y deterministas.
 */

/** 1 m de columna de agua en bar (ρ = 1000 kg/m³, g = 9.81 m/s²). */
const BAR_PER_METER = 0.0981;
/** Debajo de esta apertura la válvula se considera cerrada. */
const VALVE_CLOSED = 0.02;
/**
 * Corte de bajo caudal, como el de un caudalímetro real: por debajo del 1 % del rango marca
 * cero (el decaimiento exponencial nunca llegaría a cero exacto).
 */
const LOW_FLOW_CUTOFF = 0.01;

export interface ProcessParams {
  /** Carga al cierre (caudal cero) y caudal a carga cero de la bomba. */
  readonly pump: { readonly shutoffHead: number; readonly maxFlow: number };
  /** Coeficientes de pérdida, en m/(m³/h)². */
  readonly losses: { readonly perMeter: number; readonly perElbow: number; readonly valveOpen: number };
  /** Desnivel entre la cisterna y la entrada del tanque, en m. */
  readonly elevation: number;
  readonly tank: {
    readonly height: number;
    readonly area: number;
    /** Puntos de control (fracción del alto): arranque por nivel bajo y paro por nivel alto. */
    readonly start: number;
    readonly stop: number;
    /** Nivel muy alto: dispara la bomba en cualquier modo (protección contra derrame). */
    readonly highHigh: number;
  };
  /** Consumo que sale del tanque, en m³/h. */
  readonly demand: number;
  /** Tiempo de respuesta del caudal (arranque de la bomba, maniobra de válvula), en s. */
  readonly responseTime: number;
  /** Aceleración del tiempo del proceso para que el nivel se mueva a ritmo de demo. */
  readonly timeScale: number;
}

export type ControlMode = "auto" | "manual";

export interface ProcessInputs {
  /** La tubería une la descarga de la bomba con el tanque. */
  readonly connected: boolean;
  /** Automático: el control de nivel decide. Manual: el operador arranca y detiene. */
  readonly mode: ControlMode;
  /** Mando del operador en manual (en automático no cuenta). */
  readonly run: boolean;
  /** Puntos de arranque y paro que fijó el operador (si no, los de la instalación). */
  readonly setpoints?: { readonly start: number; readonly stop: number };
  /** Apertura de la válvula, 0–1. */
  readonly valve: number;
  /** Largo de la ruta en m y número de codos. */
  readonly length: number;
  readonly elbows: number;
}

export interface ProcessState {
  /** La bomba tenía permiso de girar en el paso anterior (para detectar arranques). */
  readonly armed: boolean;
  /** La bomba está girando. */
  readonly running: boolean;
  /** La línea ya se llenó alguna vez (con check, la columna queda llena al parar). */
  readonly primed: boolean;
  readonly flow: number;
  /** Nivel del tanque, 0–1. */
  readonly level: number;
}

export type ProcessEvent =
  | { readonly kind: "start" }
  | { readonly kind: "stop" }
  | { readonly kind: "high-level-stop"; readonly level: number }
  | { readonly kind: "low-level-start"; readonly level: number }
  | { readonly kind: "high-high-stop"; readonly level: number };

export interface Readings {
  /** Caudal (FIT), m³/h. */
  readonly flow: number;
  /** Presión en la descarga (PIT), bar. */
  readonly pressure: number;
  /** Nivel (LIT), 0–1. */
  readonly level: number;
}

export const initialState = (level: number): ProcessState => ({
  armed: false,
  running: false,
  primed: false,
  flow: 0,
  level,
});

/**
 * Coeficiente de pérdida de la válvula: crece como 1/apertura³, así casi no estrangula hasta
 * que está muy cerrada (como una válvula real). Cerrada, infinito.
 */
export function valveLoss(params: ProcessParams, opening: number): number {
  if (opening <= VALVE_CLOSED) return Number.POSITIVE_INFINITY;
  return params.losses.valveOpen / opening ** 3;
}

export function staticHead(params: ProcessParams, level: number): number {
  return params.elevation + level * params.tank.height;
}

const pumpK = (params: ProcessParams) => params.pump.shutoffHead / params.pump.maxFlow ** 2;

/** Carga que entrega la bomba a un caudal dado. */
export function pumpHead(params: ProcessParams, flow: number): number {
  return Math.max(0, params.pump.shutoffHead - pumpK(params) * flow * flow);
}

/** Caudal de equilibrio: el cruce de la curva de la bomba con la del sistema. */
export function operatingFlow(
  params: ProcessParams,
  inputs: ProcessInputs,
  level: number,
  running: boolean,
): number {
  if (!running || !inputs.connected) return 0;
  const lift = params.pump.shutoffHead - staticHead(params, level);
  const system =
    params.losses.perMeter * inputs.length +
    params.losses.perElbow * inputs.elbows +
    valveLoss(params, inputs.valve);
  if (lift <= 0 || !Number.isFinite(system)) return 0;
  return Math.sqrt(lift / (pumpK(params) + system));
}

/** Lo que leen los instrumentos en un estado dado. */
export function readings(params: ProcessParams, state: ProcessState): Readings {
  // Girando, la descarga ve la carga de la bomba a su caudal; detenida, la columna que sostiene
  // la check (si la línea ya se llenó).
  const head = state.running
    ? pumpHead(params, state.flow)
    : state.primed
      ? staticHead(params, state.level)
      : 0;
  return { flow: state.flow, pressure: head * BAR_PER_METER, level: state.level };
}

/**
 * Avanza el proceso `dt` segundos reales. Devuelve el estado nuevo y los eventos del control
 * de nivel (arranques y paros), que la vista registra como "dato → cambio operativo".
 */
export function step(
  params: ProcessParams,
  state: ProcessState,
  inputs: ProcessInputs,
  dt: number,
): { state: ProcessState; events: ProcessEvent[] } {
  const events: ProcessEvent[] = [];
  const { highHigh } = params.tank;
  const { start, stop } = inputs.setpoints ?? params.tank;
  const auto = inputs.mode === "auto";

  // Permiso de girar: en automático, la línea conectada; en manual, además el mando del operador.
  const armed = inputs.connected && (auto || inputs.run);
  let running = state.running;
  if (!armed) {
    if (running) events.push({ kind: "stop" });
    running = false;
  } else if (!state.armed) {
    // Arranque (del operador, o al entrar en automático); con el tanque ya arriba, espera.
    if (state.level < (auto ? stop : highHigh)) {
      running = true;
      events.push({ kind: "start" });
    }
  } else if (running && state.level >= highHigh) {
    // Protección: dispara en cualquier modo. En manual hace falta un arranque nuevo.
    running = false;
    events.push({ kind: "high-high-stop", level: state.level });
  } else if (auto && running && state.level >= stop) {
    running = false;
    events.push({ kind: "high-level-stop", level: state.level });
  } else if (auto && !running && state.level <= start) {
    running = true;
    events.push({ kind: "low-level-start", level: state.level });
  }

  const target = operatingFlow(params, inputs, state.level, running);
  const blend = 1 - Math.exp(-dt / params.responseTime);
  const flow = state.flow + (target - state.flow) * blend;
  const simulated = dt * params.timeScale;
  const volume = params.tank.area * params.tank.height;
  const level = Math.min(1, Math.max(0, state.level + ((flow - params.demand) * simulated) / 3600 / volume));

  return {
    state: {
      armed,
      running,
      primed: state.primed || flow > 0.5,
      flow: target === 0 && flow < params.pump.maxFlow * LOW_FLOW_CUTOFF ? 0 : flow,
      level,
    },
    events,
  };
}

/** Paso máximo de integración, en segundos reales. */
export const MAX_STEP = 0.05;

/**
 * Avanza `elapsed` segundos en pasos de a lo más MAX_STEP. Así el proceso corre igual a 120, 60
 * o 10 cuadros por segundo: un teléfono saturado ve el mismo tanque llenarse al mismo ritmo, y
 * el control no se pasa de sus puntos de arranque y paro por un paso grande.
 */
export function advance(
  params: ProcessParams,
  state: ProcessState,
  inputs: ProcessInputs,
  elapsed: number,
): { state: ProcessState; events: ProcessEvent[] } {
  const events: ProcessEvent[] = [];
  let current = state;
  let remaining = elapsed;
  while (remaining > 1e-9) {
    const dt = Math.min(MAX_STEP, remaining);
    const next = step(params, current, inputs, dt);
    current = next.state;
    events.push(...next.events);
    remaining -= dt;
  }
  return { state: current, events };
}
