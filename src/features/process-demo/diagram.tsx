import type { CSSProperties, ReactNode, Ref, SVGProps } from "react";
import { mediaUrl } from "@/media";
import type { Tone } from "./app";
import { inletRun, type Run, runThrough, suctionRun } from "./connection";
import type { Piece } from "./geometry/pipes";
import { shadeFlips } from "./geometry/shade";
import styles from "./process-demo.module.css";
import {
  FITTINGS,
  INITIAL_LEVEL,
  type Instrument,
  type Layout,
  PROCESS,
  PUMP_RENDER,
  pumpPlacement,
  SCENES,
  type Scene,
} from "./scene";

/**
 * El diagrama de proceso de la app, sin estado: lo usan el póster del servidor y la versión
 * interactiva. Equipo y tubería con los materiales de la demo de proceso (acero en bandas, bridas
 * atornilladas, el render de la bomba) y colores solo de tokens; instrumentos como etiquetas de
 * dato, como en un sistema de supervisión. Lo que la simulación mueve cada cuadro lleva `data-*`.
 */

// ---------- Tramos ----------

export interface RunView {
  readonly key: string;
  readonly pieces: readonly Piece[];
  /** Sin brida al inicio o al final (punta en el agua, boquilla soldada, salida del lienzo). */
  readonly bare?: "start" | "end";
  /** Recién conectado: sus piezas se atornillan una tras otra. */
  readonly fresh?: boolean;
}

export interface FixedRuns {
  readonly suction: Run;
  readonly header: Run;
  readonly inlet: Run;
  readonly outlet: Run;
  /** Codos que ya trae la instalación (entran en las pérdidas). */
  readonly elbows: number;
  readonly views: readonly RunView[];
}

export const FIXED: Record<Layout, FixedRuns> = (() => {
  const build = (scene: Scene): FixedRuns => {
    const suction = suctionRun(scene);
    const header = runThrough(scene.header);
    const inlet = inletRun(scene);
    const outlet = runThrough(scene.outlet);
    return {
      suction,
      header,
      inlet,
      outlet,
      elbows: suction.elbows + header.elbows,
      views: [
        { key: "suction", pieces: suction.pieces, bare: "start" },
        { key: "header", pieces: header.pieces },
        { key: "inlet", pieces: inlet.pieces, bare: "end" },
        { key: "outlet", pieces: outlet.pieces, bare: "end" },
      ],
    };
  };
  return { h: build(SCENES.h), v: build(SCENES.v) };
})();

// ---------- Materiales ----------

type Stops = ReadonlyArray<readonly [offset: number, color: string]>;

/**
 * Colores de los materiales, siempre de los tokens. Van escritos completos a propósito: Tailwind
 * solo emite las variables de tema que encuentra en el código, y un nombre armado en tiempo de
 * ejecución no lo encuentra (el color quedaría vacío).
 */
const color = {
  metal50: "var(--color-metal-50)",
  metal200: "var(--color-metal-200)",
  metal300: "var(--color-metal-300)",
  metal400: "var(--color-metal-400)",
  metal500: "var(--color-metal-500)",
  metal600: "var(--color-metal-600)",
  agua300: "var(--color-agua-300)",
  agua600: "var(--color-agua-600)",
  pacifico400: "var(--color-pacifico-400)",
  pacifico500: "var(--color-pacifico-500)",
  pacifico600: "var(--color-pacifico-600)",
  noche: "var(--color-noche)",
  blanco: "var(--color-blanco)",
} as const;
const mix = (a: string, b: string, amount: number) => `color-mix(in oklab, ${a} ${amount}%, ${b})`;

/** Bandas del acero pulido de la demo de proceso (METAL_STOPS), de un borde del tubo al otro. */
const METAL: Stops = [
  [0, color.metal400],
  [0.15, color.metal50],
  [0.45, color.metal300],
  [0.6, color.metal600],
  [0.85, color.metal300],
  [1, color.metal500],
];
const reversed = (stops: Stops): Stops => stops.map(([o, c]) => [1 - o, c] as const).reverse();
/** El codo es un anillo de radio 28 a 44: las bandas se reparten en ese grosor. */
const INNER = 28 / 44;
const ring = (stops: Stops): Stops => stops.map(([o, c]) => [INNER + o * (1 - INNER), c] as const);

/** Pintura del caudalímetro: el azul de la bomba, con luz desde arriba. */
const PAINT: Stops = [
  [0, mix(color.pacifico600, color.noche, 55)],
  [0.14, mix(color.pacifico400, color.blanco, 62)],
  [0.38, color.pacifico500],
  [0.78, color.pacifico600],
  [1, mix(color.pacifico600, color.noche, 45)],
];
const HOUSING: Stops = [
  [0, color.metal300],
  [0.2, color.metal50],
  [0.7, color.metal200],
  [1, color.metal500],
];
const LIQUID: Stops = [
  [0, color.agua300],
  [1, color.agua600],
];

function Gradient({ id, stops, x = false }: { id: string; stops: Stops; x?: boolean }) {
  return (
    <linearGradient id={id} x1={0} y1={0} x2={x ? 1 : 0} y2={x ? 0 : 1}>
      {stops.map(([offset, stop]) => (
        <stop key={offset} offset={offset} style={{ stopColor: stop }} />
      ))}
    </linearGradient>
  );
}

function RingGradient({ id, stops }: { id: string; stops: Stops }) {
  return (
    <radialGradient id={id} cx={72} cy={0} r={44} gradientUnits="userSpaceOnUse">
      {stops.map(([offset, stop]) => (
        <stop key={offset} offset={offset} style={{ stopColor: stop }} />
      ))}
    </radialGradient>
  );
}

/** Ids de los materiales de un lienzo (el póster dibuja los dos a la vez: van con prefijo). */
function idsFor(layout: Layout) {
  const id = (name: string) => `pd-${layout}-${name}`;
  return {
    metal: id("metal"),
    metalR: id("metal-r"),
    elbow: id("elbow"),
    elbowR: id("elbow-r"),
    steelX: id("steel-x"),
    paint: id("paint"),
    housing: id("housing"),
    liquid: id("liquid"),
    glass: id("glass"),
    tank: id("tank"),
  };
}
type Ids = ReturnType<typeof idsFor>;
const url = (id: string) => `url(#${id})`;

function Materials({ ids, tank }: { ids: Ids; tank: string }) {
  return (
    <defs>
      <Gradient id={ids.metal} stops={METAL} />
      <Gradient id={ids.metalR} stops={reversed(METAL)} />
      <RingGradient id={ids.elbow} stops={ring(METAL)} />
      <RingGradient id={ids.elbowR} stops={ring(reversed(METAL))} />
      <Gradient id={ids.steelX} stops={METAL} x />
      <Gradient id={ids.paint} stops={PAINT} />
      <Gradient id={ids.housing} stops={HOUSING} />
      <Gradient id={ids.liquid} stops={LIQUID} />
      {/* Volumen del cilindro: reflejo a la izquierda, sombra a la derecha. */}
      <linearGradient id={ids.glass} x1={0} y1={0} x2={1} y2={0}>
        <stop offset={0} style={{ stopColor: color.blanco, stopOpacity: 0 }} />
        <stop offset={0.16} style={{ stopColor: color.blanco, stopOpacity: 0.32 }} />
        <stop offset={0.34} style={{ stopColor: color.blanco, stopOpacity: 0 }} />
        <stop offset={0.7} style={{ stopColor: color.noche, stopOpacity: 0 }} />
        <stop offset={1} style={{ stopColor: color.noche, stopOpacity: 0.22 }} />
      </linearGradient>
      <clipPath id={ids.tank}>
        <path d={tank} />
      </clipPath>
    </defs>
  );
}

// ---------- Tubería ----------

/** Anillo del codo: un cuarto de círculo de radio 36 por el eje (el giro del trazo de la marca). */
const ELBOW_D = "M28 0A44 44 0 0 0 72 44L72 28A28 28 0 0 1 44 0Z";
/** Bridas del codo en sus dos puertos, en coordenadas de la brida (6 × 24). */
const ELBOW_FLANGES = ["translate(48 0) rotate(90)", "translate(66 24)"] as const;
/** Una brida tan corta no cabe: el tramo queda como niple entre los codos. */
const MIN_FLANGED = 14;

const placement = (piece: Piece) =>
  `translate(${piece.x} ${piece.y}) rotate(${piece.rotation} ${piece.w / 2} ${piece.h / 2})`;
const pieceKey = (piece: Piece) => `${piece.kind}-${piece.x}-${piece.y}-${piece.rotation}`;

function Flange({ transform, fill }: { transform: string; fill: string }) {
  return (
    <g transform={transform}>
      <rect width={6} height={24} fill={fill} />
      <circle className={styles.bolt} cx={3} cy={3.2} r={1.4} />
      <circle className={styles.bolt} cx={3} cy={20.8} r={1.4} />
    </g>
  );
}

interface RunLayers {
  readonly runs: readonly RunView[];
  readonly flips: readonly boolean[];
  readonly ids: Ids;
}

/** Índice de la primera pieza de cada tramo en la lista plana de la red. */
const firstIndex = (runs: readonly RunView[]) =>
  runs.map((_, i) => runs.slice(0, i).reduce((count, run) => count + run.pieces.length, 0));

/** Cuerpos de toda la red (debajo del agua). */
function PipeBodies({ runs, flips, ids }: RunLayers) {
  const starts = firstIndex(runs);
  return (
    <g>
      {runs.map((run, r) => (
        <g key={run.key} data-run={run.key} data-fresh={run.fresh || undefined}>
          {run.pieces.map((piece, order) => {
            const flip = flips[(starts[r] ?? 0) + order];
            return (
              <g key={pieceKey(piece)} transform={placement(piece)}>
                <g className={styles.piece} style={{ "--i": order } as CSSProperties} data-piece>
                  {piece.kind === "straight" ? (
                    <rect y={4} width={piece.w} height={16} fill={url(flip ? ids.metalR : ids.metal)} />
                  ) : (
                    <path d={ELBOW_D} fill={url(flip ? ids.elbowR : ids.elbow)} />
                  )}
                </g>
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

/** Bridas de toda la red (encima del agua: tapan el núcleo, como en una tubería real). */
function PipeFlanges({ runs, flips, ids }: RunLayers) {
  const starts = firstIndex(runs);
  return (
    <g data-flanges>
      {runs.map((run, r) => (
        <g key={run.key} data-fresh={run.fresh || undefined}>
          {run.pieces.map((piece, order) => {
            const fill = url(flips[(starts[r] ?? 0) + order] ? ids.metalR : ids.metal);
            const first = order === 0;
            const last = order === run.pieces.length - 1;
            const transforms =
              piece.kind === "elbow"
                ? ELBOW_FLANGES
                : piece.w < MIN_FLANGED
                  ? []
                  : [
                      ...(first && run.bare === "start" ? [] : ["translate(0 0)"]),
                      ...(last && run.bare === "end" ? [] : [`translate(${piece.w - 6} 0)`]),
                    ];
            return (
              <g key={pieceKey(piece)} transform={placement(piece)}>
                <g className={styles.flangeSet} style={{ "--i": order } as CSSProperties} data-flange>
                  {transforms.map((transform) => (
                    <Flange key={transform} transform={transform} fill={fill} />
                  ))}
                </g>
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

// ---------- Equipo ----------

function Cistern({ scene, ids }: { scene: Scene; ids: Ids }) {
  const { x, y, w, h, water } = scene.cistern;
  const wall = 6;
  const surface = y + h * (1 - water);
  return (
    <g data-enter="equipment">
      <rect className={styles.vesselInside} x={x} y={y} width={w} height={h} />
      <rect
        x={x + wall}
        y={surface}
        width={w - wall * 2}
        height={y + h - wall - surface}
        fill={url(ids.liquid)}
      />
      <line className={styles.meniscus} x1={x + wall} x2={x + w - wall} y1={surface} y2={surface} />
      {/* Muros y fondo de la cisterna, abierta arriba. */}
      <path
        className={styles.vesselWall}
        d={`M${x} ${y}V${y + h}H${x + w}V${y}H${x + w - wall}V${y + h - wall}H${x + wall}V${y}Z`}
      />
    </g>
  );
}

/** Silueta del cilindro: lados y las dos tapas elípticas. */
function tankOutline(scene: Scene) {
  const { x, y, w, h, cap } = scene.tank;
  const r = w / 2;
  return `M${x} ${y}V${y + h}A${r} ${cap} 0 0 0 ${x + w} ${y + h}V${y}A${r} ${cap} 0 0 0 ${x} ${y}Z`;
}

/** Nivel → altura de la superficie del líquido en el lienzo. */
export function surfaceY(scene: Scene, level: number) {
  const { y, h } = scene.tank;
  return y + h - level * h;
}

function TankStand({ scene, ids }: { scene: Scene; ids: Ids }) {
  const { x, y, w, h, cap, legs, base } = scene.tank;
  const top = y + h + cap * 0.4;
  const bay = (base - top) / 2;
  const [left, right] = legs;
  return (
    <g data-enter="equipment">
      {[0, 1].map((i) => {
        const a = top + bay * i + 6;
        const b = top + bay * (i + 1) - 6;
        return (
          <g key={i} className={styles.brace}>
            <line x1={left} y1={a} x2={right} y2={b} />
            <line x1={right} y1={a} x2={left} y2={b} />
            <line x1={left} y1={top + bay * (i + 1)} x2={right} y2={top + bay * (i + 1)} />
          </g>
        );
      })}
      {legs.map((legX) => (
        <g key={legX}>
          <rect x={legX - 5} y={top - 4} width={10} height={base - top + 4} fill={url(ids.steelX)} />
          <rect className={styles.basePlate} x={legX - 10} y={base - 4} width={20} height={4} />
        </g>
      ))}
      <rect x={x - 6} y={y + h - 2} width={w + 12} height={8} fill={url(ids.metal)} />
    </g>
  );
}

function Tank({ scene, ids }: { scene: Scene; ids: Ids }) {
  const { x, y, w, h, cap } = scene.tank;
  const r = w / 2;
  const hoop = (yy: number) => `M${x} ${yy}A${r} ${cap} 0 0 0 ${x + w} ${yy}`;
  // Nivel inicial en el marcado: el póster ya lo muestra; después lo mueve la simulación.
  const level = surfaceY(scene, INITIAL_LEVEL);
  const mark = (fraction: number) => surfaceY(scene, fraction);
  return (
    <g data-enter="equipment">
      <path className={styles.vesselInside} d={tankOutline(scene)} />
      <g clipPath={url(ids.tank)}>
        <g data-liquid style={{ transform: `translateY(${level}px)` }}>
          <rect x={x} y={0} width={w} height={h + cap * 2} fill={url(ids.liquid)} />
          <ellipse className={styles.surface} cx={x + r} cy={0} rx={r} ry={cap} />
        </g>
        <line
          className={styles.beam}
          x1={scene.radar.x}
          x2={scene.radar.x}
          y1={y - cap}
          y2={level}
          data-beam
        />
        <rect x={x} y={y - cap} width={w} height={h + cap * 2} fill={url(ids.glass)} />
      </g>
      <path className={styles.hoop} d={hoop(y + h * 0.36)} />
      <path className={styles.hoop} d={hoop(y + h * 0.72)} />
      <path className={styles.rim} d={`M${x} ${y}V${y + h}A${r} ${cap} 0 0 0 ${x + w} ${y + h}V${y}`} />
      <ellipse cx={x + r} cy={y} rx={r} ry={cap} fill={url(ids.housing)} />
      <ellipse className={styles.rim} cx={x + r} cy={y} rx={r} ry={cap} />
      {/* Puntos de arranque y paro del control, al costado del tanque. */}
      {[PROCESS.tank.start, PROCESS.tank.stop].map((fraction) => (
        <line
          key={fraction}
          className={styles.setpoint}
          x1={x + w + 4}
          x2={x + w + 12}
          y1={mark(fraction)}
          y2={mark(fraction)}
        />
      ))}
    </g>
  );
}

function Radar({ scene, ids }: { scene: Scene; ids: Ids }) {
  const { x, y } = scene.radar;
  return (
    <g data-enter="equipment" transform={`translate(${x} ${y})`}>
      <rect x={-5} y={-12} width={10} height={14} fill={url(ids.steelX)} />
      <rect x={-10} y={-15} width={20} height={4} fill={url(ids.metal)} />
      <rect x={-12} y={-36} width={24} height={22} rx={7} fill={url(ids.housing)} />
    </g>
  );
}

/** El render de la bomba; su luz de estado va sobre la caja de conexiones del motor. */
function Pump({ scene }: { scene: Scene }) {
  const pump = pumpPlacement(scene);
  return (
    <g data-enter="equipment" data-pump>
      <image
        href={mediaUrl(PUMP_RENDER.media, PUMP_RENDER.width, "webp")}
        x={pump.x}
        y={pump.y}
        width={pump.w}
        height={pump.h}
      />
      <circle
        className={styles.led}
        cx={pump.x + pump.w * 0.676}
        cy={pump.y + pump.h * 0.106}
        r={pump.w / 70}
      />
    </g>
  );
}

function Flowmeter({ scene, ids }: { scene: Scene; ids: Ids }) {
  const { at, axis } = scene.flowmeter;
  return (
    <g data-enter="equipment" transform={`translate(${at.x} ${at.y}) rotate(${axis === "v" ? 90 : 0})`}>
      <rect x={-32} y={-20} width={6} height={40} fill={url(ids.metal)} />
      <rect x={26} y={-20} width={6} height={40} fill={url(ids.metal)} />
      <rect x={-26} y={-17} width={52} height={34} rx={4} fill={url(ids.paint)} />
      <rect className={styles.band} x={-9} y={-17} width={18} height={34} />
    </g>
  );
}

export function leverPivot(scene: Scene) {
  const { at, axis } = scene.valve;
  return axis === "h" ? { x: at.x, y: at.y - 24 } : { x: at.x + 24, y: at.y };
}

export function leverAngle(scene: Scene, opening: number) {
  const { open, closed } = scene.valve;
  return closed + (open - closed) * opening;
}

/** Válvula de bola, de lado: cuerpo en el tubo, vástago y palanca de un cuarto de vuelta. */
function Valve({ scene, ids, opening }: { scene: Scene; ids: Ids; opening: number }) {
  const { at, axis } = scene.valve;
  const pivot = leverPivot(scene);
  return (
    <g data-enter="equipment">
      <g transform={`translate(${at.x} ${at.y}) rotate(${axis === "v" ? 90 : 0})`}>
        <rect x={-24} y={-14} width={6} height={28} fill={url(ids.metal)} />
        <rect x={18} y={-14} width={6} height={28} fill={url(ids.metal)} />
        <rect x={-18} y={-13} width={36} height={26} rx={6} fill={url(ids.housing)} />
        <rect x={-4} y={-24} width={8} height={12} fill={url(ids.steelX)} />
      </g>
      {/* Abierta: la palanca corre a lo largo del tubo; cerrada, atravesada. */}
      <g transform={`translate(${pivot.x} ${pivot.y})`}>
        <g
          className={styles.lever}
          data-lever
          style={{ transform: `rotate(${leverAngle(scene, opening)}deg)` }}
        >
          <rect x={-4} y={-3.5} width={44} height={7} rx={3.5} fill={url(ids.metal)} />
          <rect className={styles.grip} x={20} y={-5} width={24} height={10} rx={5} />
          <circle r={5.5} fill={url(ids.housing)} />
        </g>
      </g>
    </g>
  );
}

export interface DiagramReadings {
  readonly flow: string;
  readonly pressure: string;
  readonly level: string;
}

const UNITS: Record<Instrument["reading"], string> = { flow: "m³/h", pressure: "bar", level: "%" };

/** Etiquetas de dato de los instrumentos: toma, guía y caja con código y valor vivo. */
function Instruments({ scene, readings }: { scene: Scene; readings: DiagramReadings }) {
  const { w, h } = scene.tagSize;
  return (
    <g data-enter="equipment">
      {scene.instruments.map(({ code, reading, tap, box }) => {
        // La guía llega al borde de la caja más cercano a la toma.
        const edge = {
          x: Math.min(Math.max(tap.x, box.x), box.x + w),
          y: Math.min(Math.max(tap.y, box.y), box.y + h),
        };
        return (
          <g key={code} data-instrument={code}>
            <line className={styles.leader} x1={tap.x} y1={tap.y} x2={edge.x} y2={edge.y} />
            <circle className={styles.tap} cx={tap.x} cy={tap.y} r={3} />
            <rect className={styles.tagBox} x={box.x} y={box.y} width={w} height={h} />
            <text className={styles.tagCode} x={box.x + 7} y={box.y + 14}>
              {code}
            </text>
            <text className={styles.tagValue} x={box.x + 7} y={box.y + h - 9}>
              {readings[reading]}
              <tspan className={styles.tagUnit} dx={4}>
                {UNITS[reading]}
              </tspan>
            </text>
          </g>
        );
      })}
    </g>
  );
}

function EquipmentTags({ scene }: { scene: Scene }) {
  const tags: ReadonlyArray<readonly [keyof Scene["tags"], string]> = [
    ["pump", "P-101"],
    ["tank", "TK-101"],
    ["cistern", "TK-100"],
  ];
  return (
    <g data-enter="equipment">
      {tags.map(([key, text]) => (
        <text
          key={key}
          className={styles.equipmentTag}
          x={scene.tags[key].x}
          y={scene.tags[key].y}
          textAnchor={key === "cistern" ? "start" : "middle"}
        >
          {text}
        </text>
      ))}
    </g>
  );
}

export function OpenPort({ x, y, target }: { x: number; y: number; target?: boolean }) {
  return (
    <g data-open-port data-target={target || undefined} transform={`translate(${x} ${y})`}>
      <circle className={styles.portPulse} r={20} />
      <circle className={styles.portRing} r={20} />
    </g>
  );
}

// ---------- Lienzo ----------

interface DiagramProps {
  readonly layout: Layout;
  readonly label: string;
  readonly opening: number;
  /** El tramo conectado por el visitante, si ya existe. */
  readonly connection?: RunView | null;
  readonly readings: DiagramReadings;
  readonly tone: Tone;
  readonly className?: string;
  readonly svgRef?: Ref<SVGSVGElement>;
  /** Agua: entre los cuerpos de la tubería y sus bridas. */
  readonly fluid?: ReactNode;
  /** Vista previa y puertos: encima de todo. */
  readonly overlay?: ReactNode;
  readonly svgProps?: Omit<SVGProps<SVGSVGElement>, "ref" | "viewBox" | "className">;
}

export function Diagram({
  layout,
  label,
  opening,
  connection,
  readings,
  tone,
  className,
  svgRef,
  fluid,
  overlay,
  svgProps,
}: DiagramProps) {
  const scene = SCENES[layout];
  const ids = idsFor(layout);
  const network = connection ? [...FIXED[layout].views, connection] : FIXED[layout].views;
  // Una sola polaridad de bandas para toda la red: las juntas entre tramos también quedan continuas.
  const flips = shadeFlips(
    network.flatMap((run) => run.pieces),
    FITTINGS,
  );
  const layers = { runs: network, flips, ids };
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${scene.viewBox.width} ${scene.viewBox.height}`}
      className={className}
      role="img"
      aria-label={label}
      data-layout={layout}
      data-tone={tone}
      style={{ "--aspect": scene.viewBox.width / scene.viewBox.height } as CSSProperties}
      {...svgProps}
    >
      <Materials ids={ids} tank={tankOutline(scene)} />
      <Cistern scene={scene} ids={ids} />
      <TankStand scene={scene} ids={ids} />
      <Tank scene={scene} ids={ids} />
      <Radar scene={scene} ids={ids} />
      <PipeBodies {...layers} />
      <g>{fluid}</g>
      <PipeFlanges {...layers} />
      <Pump scene={scene} />
      <Flowmeter scene={scene} ids={ids} />
      <Valve scene={scene} ids={ids} opening={opening} />
      <Instruments scene={scene} readings={readings} />
      <EquipmentTags scene={scene} />
      {overlay}
    </svg>
  );
}
