import type { MediaId } from "@/media";
import type { FittingSet } from "./geometry/pipes";
import type { Point, Port } from "./geometry/ports";
import type { ProcessParams } from "./hydraulics";

/**
 * La estación de bombeo de la app, en cada orientación: cisterna TK-100 → bomba P-101 → cabezal
 * con caudalímetro FIT-101 y válvula XV-101 → [el tramo que se conecta] → tanque elevado TK-101 →
 * consumo. Nombres genéricos: la demo no lleva datos de ningún cliente.
 * - "h" (desktop): el cabezal corre horizontal y el tramo pendiente es una Z hacia el tanque;
 * - "v" (móvil): la bomba sube el agua por un cabezal vertical; el tramo pendiente es una L.
 *
 * Coordenadas en unidades del lienzo (las del `viewBox`). Los tramos fijos se definen desde la
 * descarga de la bomba con desplazamientos enteros: así cada pieza mide un entero y la tubería
 * cierra exacta aunque la bomba quede en una posición fraccional.
 */

export type Layout = "h" | "v";
export type Axis = "h" | "v";

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Etiqueta de un instrumento: toma sobre el tubo y caja con su código y su valor vivo. */
export interface Instrument {
  readonly code: "FIT-101" | "PIT-101" | "LIT-101";
  readonly reading: "flow" | "pressure" | "level";
  readonly tap: Point;
  /** Esquina superior izquierda de la caja de la etiqueta. */
  readonly box: Point;
}

export interface Scene {
  readonly viewBox: { readonly width: number; readonly height: number };
  /** Cisterna (recipiente abierto) y la fracción de agua que tiene. */
  readonly cistern: Box & { readonly water: number };
  /** La bomba se coloca por su brida de descarga y se dibuja con este ancho. */
  readonly pump: { readonly discharge: Point; readonly width: number };
  /** Cuerpo cilíndrico del tanque, sus tapas (alto `cap`), columnas y base. */
  readonly tank: Box & {
    readonly cap: number;
    readonly legs: readonly [number, number];
    readonly base: number;
  };
  /** Succión: desde dentro del agua hasta la brida de succión (largo entero, sale de la bomba). */
  readonly suctionDepth: number;
  /** Cabezal ya construido, en el sentido del flujo (empieza en la descarga). */
  readonly header: readonly Point[];
  /** Descarga del tanque hacia el consumo. */
  readonly outlet: readonly Point[];
  /** Puertos del tramo pendiente: el final del cabezal y la boquilla del tanque. */
  readonly headerPort: Port;
  readonly tankPort: Port;
  /** Caudalímetro y válvula sobre el cabezal (centro y eje). */
  readonly flowmeter: { readonly at: Point; readonly axis: Axis };
  readonly valve: {
    readonly at: Point;
    readonly axis: Axis;
    /** Ángulo de la palanca abierta (a lo largo del tubo) y cerrada (atravesada), en grados. */
    readonly open: number;
    readonly closed: number;
  };
  /** Transmisor de nivel por radar, sobre el techo del tanque. */
  readonly radar: Point;
  readonly instruments: readonly Instrument[];
  /** Medida de las cajas de etiqueta (más angostas en el lienzo vertical). */
  readonly tagSize: { readonly w: number; readonly h: number };
  /** Etiquetas de equipo (texto). */
  readonly tags: { readonly pump: Point; readonly tank: Point; readonly cistern: Point };
  /** Posición del tramo intermedio de la ruta sugerida (en una Z). */
  readonly suggestedBend: number | null;
  /** Metros por unidad del lienzo (para la hidráulica). */
  readonly metersPerUnit: number;
}

/** Tubería con las proporciones de la demo de proceso: tubo de 16 en una caja de 24 y codos de 72. */
export const FITTINGS: FittingSet = {
  straight: {
    height: 24,
    minLength: 8,
    ports: [
      { fx: 0, fy: 0.5, dir: 180 },
      { fx: 1, fy: 0.5, dir: 0 },
    ],
  },
  elbow: {
    size: 72,
    ports: [
      { fx: 0.5, fy: 0, dir: 270 },
      { fx: 1, fy: 0.5, dir: 0 },
    ],
  },
};

/** Un puntero a esta distancia de un puerto abierto lo toma (empezar a conectar, o llegar). */
export const PORT_SNAP = 44;

/**
 * Render de la bomba (el de la demo de proceso, con fondo transparente) y sus bridas, medidas en píxeles
 * sobre la imagen: succión abajo y descarga al costado del motor, como en el sistema original.
 */
export const PUMP_RENDER = {
  media: "equipo-bomba-centrifuga",
  width: 560,
  height: 411,
  suction: { x: 250, y: 399 },
  discharge: { x: 535, y: 168 },
} as const satisfies {
  media: MediaId;
  width: number;
  height: number;
  suction: Point;
  discharge: Point;
};

export interface PumpPlacement extends Box {
  readonly suction: Port;
  readonly discharge: Port;
}

/** Caja del render y sus dos bridas en el lienzo. */
export function pumpPlacement(scene: Scene): PumpPlacement {
  const { discharge, width } = scene.pump;
  const scale = width / PUMP_RENDER.width;
  const x = discharge.x - PUMP_RENDER.discharge.x * scale;
  const y = discharge.y - PUMP_RENDER.discharge.y * scale;
  return {
    x,
    y,
    w: width,
    h: PUMP_RENDER.height * scale,
    discharge: { ...discharge, dir: 0 },
    suction: { x: x + PUMP_RENDER.suction.x * scale, y: y + PUMP_RENDER.suction.y * scale, dir: 90 },
  };
}

export const SCENES: Record<Layout, Scene> = {
  h: {
    viewBox: { width: 1040, height: 520 },
    cistern: { x: 222, y: 440, w: 176, h: 72, water: 0.6 },
    pump: { discharge: { x: 430, y: 320 }, width: 240 },
    tank: { x: 860, y: 60, w: 130, h: 160, cap: 11, legs: [880, 970], base: 500 },
    suctionDepth: 70,
    header: [
      { x: 430, y: 320 },
      { x: 480, y: 320 },
      { x: 480, y: 200 },
      { x: 690, y: 200 },
    ],
    outlet: [
      { x: 925, y: 231 },
      { x: 925, y: 300 },
      { x: 1040, y: 300 },
    ],
    headerPort: { x: 690, y: 200, dir: 0 },
    tankPort: { x: 842, y: 90, dir: 180 },
    // Separados del puerto del cabezal: su zona táctil no debe tapar la palanca.
    flowmeter: { at: { x: 550, y: 200 }, axis: "h" },
    valve: { at: { x: 610, y: 200 }, axis: "h", open: 0, closed: -90 },
    radar: { x: 955, y: 49 },
    instruments: [
      { code: "FIT-101", reading: "flow", tap: { x: 550, y: 183 }, box: { x: 504, y: 112 } },
      { code: "PIT-101", reading: "pressure", tap: { x: 492, y: 262 }, box: { x: 512, y: 238 } },
      { code: "LIT-101", reading: "level", tap: { x: 943, y: 25 }, box: { x: 760, y: 4 } },
    ],
    tagSize: { w: 92, h: 42 },
    tags: { pump: { x: 320, y: 236 }, tank: { x: 925, y: 128 }, cistern: { x: 340, y: 432 } },
    suggestedBend: 766,
    metersPerUnit: 0.05,
  },
  v: {
    viewBox: { width: 400, height: 640 },
    cistern: { x: 40, y: 572, w: 156, h: 64, water: 0.6 },
    pump: { discharge: { x: 220, y: 470 }, width: 200 },
    tank: { x: 40, y: 50, w: 130, h: 140, cap: 10, legs: [60, 150], base: 400 },
    suctionDepth: 60,
    header: [
      { x: 220, y: 470 },
      { x: 300, y: 470 },
      { x: 300, y: 260 },
    ],
    outlet: [
      { x: 105, y: 200 },
      { x: 105, y: 250 },
      { x: 0, y: 250 },
    ],
    headerPort: { x: 300, y: 260, dir: 270 },
    tankPort: { x: 188, y: 90, dir: 0 },
    flowmeter: { at: { x: 300, y: 380 }, axis: "v" },
    // Abierta, la palanca apunta hacia abajo, lejos del puerto del cabezal.
    valve: { at: { x: 300, y: 300 }, axis: "v", open: 90, closed: 0 },
    radar: { x: 140, y: 40 },
    instruments: [
      { code: "FIT-101", reading: "flow", tap: { x: 317, y: 380 }, box: { x: 328, y: 361 } },
      { code: "PIT-101", reading: "pressure", tap: { x: 242, y: 458 }, box: { x: 172, y: 368 } },
      { code: "LIT-101", reading: "level", tap: { x: 152, y: 24 }, box: { x: 196, y: 4 } },
    ],
    tagSize: { w: 68, h: 40 },
    tags: { pump: { x: 300, y: 545 }, tank: { x: 105, y: 122 }, cistern: { x: 150, y: 564 } },
    suggestedBend: null,
    metersPerUnit: 0.05,
  },
};

/** Proceso de bombeo: bomba de 32 m al cierre, tanque de 0.6 m³ a 12 m de altura y consumo continuo. */
export const PROCESS: ProcessParams = {
  pump: { shutoffHead: 32, maxFlow: 24 },
  losses: { perMeter: 0.0012, perElbow: 0.004, valveOpen: 0.004 },
  elevation: 12,
  tank: { height: 3, area: 0.2, start: 0.4, stop: 0.9, highHigh: 0.97 },
  demand: 5,
  responseTime: 0.8,
  timeScale: 12,
};

/** Nivel inicial del tanque: entre los puntos de control, para que el primer ciclo se vea completo. */
export const INITIAL_LEVEL = 0.55;

/** Tendencia de nivel: una muestra cada 400 ms y 75 a la vista (los últimos 30 s). */
export const TREND = { intervalMs: 400, points: 75 } as const;
