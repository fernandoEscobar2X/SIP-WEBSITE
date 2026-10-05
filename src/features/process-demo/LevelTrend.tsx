"use client";

import { type PointerEvent, useState } from "react";
import { useMediaQuery } from "@/motion/media";
import { breakpoints } from "@/motion/tokens";
import styles from "./process-demo.module.css";

/**
 * Tendencia del nivel del tanque: una sola serie (el título la nombra, sin leyenda), línea de 2 px
 * y los puntos de arranque y paro como referencias con su propia etiqueta, porque son los que
 * deciden. Sin cuadrícula: solo los valores 0, 50 y 100 %. Al pasar el puntero, una cruz con el
 * valor de esa muestra.
 */

/**
 * Medidas del lienzo. Desktop: apaisada, se lee a lo ancho y no agrega altura a la app. Móvil:
 * la tendencia es una vista propia de la app, así que usa su alto y conserva el tamaño del texto.
 */
const FRAMES = {
  wide: { w: 900, h: 112, pad: { left: 30, right: 84, top: 12, bottom: 8 } },
  narrow: { w: 360, h: 330, pad: { left: 26, right: 88, top: 12, bottom: 8 } },
} as const;
const pct = (level: number) => `${Math.round(level * 100)} %`;

interface LevelTrendProps {
  readonly trend: readonly number[];
  readonly setpoints: { readonly start: number; readonly stop: number };
  readonly labels: { readonly start: string; readonly stop: string };
  /** Lo que lee un lector de pantalla (el nivel actual). */
  readonly summary: string;
}

export function LevelTrend({ trend, setpoints, labels, summary }: LevelTrendProps) {
  const [hover, setHover] = useState<number | null>(null);
  const frame = FRAMES[useMediaQuery(breakpoints.desktop) ? "wide" : "narrow"];
  const { w: W, h: H, pad: PAD } = frame;
  const PLOT_W = W - PAD.left - PAD.right;
  const PLOT_H = H - PAD.top - PAD.bottom;
  const x = (index: number, count: number) =>
    PAD.left + (count > 1 ? (index / (count - 1)) * PLOT_W : PLOT_W);
  const y = (level: number) => PAD.top + (1 - level) * PLOT_H;
  const count = trend.length;
  const line = trend
    .map((level, i) => `${i === 0 ? "M" : "L"}${x(i, count).toFixed(1)} ${y(level).toFixed(1)}`)
    .join(" ");
  const last = trend.at(-1) ?? 0;
  const shown = hover ?? count - 1;
  const value = trend[shown] ?? last;

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const local = ((event.clientX - box.left) / box.width) * W;
    const index = Math.round(((local - PAD.left) / PLOT_W) * (count - 1));
    setHover(index >= 0 && index < count ? index : null);
  };

  const references = [
    { key: "stop", level: setpoints.stop, label: `${labels.stop} ${pct(setpoints.stop)}` },
    { key: "start", level: setpoints.start, label: `${labels.start} ${pct(setpoints.start)}` },
  ];

  return (
    <svg
      className={styles.trend}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={summary}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
    >
      {[1, 0.5, 0].map((tick) => (
        <text key={tick} className={styles.axis} x={PAD.left - 8} y={y(tick) + 4}>
          {Math.round(tick * 100)}
        </text>
      ))}
      <line className={styles.baseline} x1={PAD.left} x2={PAD.left + PLOT_W} y1={y(0)} y2={y(0)} />
      {references.map((reference) => (
        <g key={reference.key}>
          <line
            className={styles.reference}
            x1={PAD.left}
            x2={PAD.left + PLOT_W}
            y1={y(reference.level)}
            y2={y(reference.level)}
          />
          <text className={styles.referenceLabel} x={PAD.left + PLOT_W + 8} y={y(reference.level) + 4}>
            {reference.label}
          </text>
        </g>
      ))}
      <path className={styles.series} d={line} />
      {hover !== null ? (
        <line className={styles.crosshair} x1={x(shown, count)} x2={x(shown, count)} y1={PAD.top} y2={y(0)} />
      ) : null}
      <circle className={styles.seriesDot} cx={x(shown, count)} cy={y(value)} r={4} />
      <text
        className={styles.seriesValue}
        x={x(shown, count) + (hover !== null && shown < count * 0.8 ? 8 : -8)}
        y={y(value) - 9}
        textAnchor={hover !== null && shown < count * 0.8 ? "start" : "end"}
      >
        {pct(value)}
      </text>
    </svg>
  );
}
