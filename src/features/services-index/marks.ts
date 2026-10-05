/**
 * Marcas de servicio: en vez de un ícono, cada servicio dibuja la forma de su propio dato
 * (referencia `kinetic-marks` de la investigación). Los datos son deterministas por servicio, así
 * la marca es la misma en el servidor, en el navegador y en las pruebas. Lienzo de 120 × 64.
 */

import { seededRandom } from "@/lib/simulated";

export const services = [
  "dashboards",
  "apps",
  "telemetry",
  "integration",
  "automation",
  "analytics",
  "custom",
  "support",
] as const;
export type Service = (typeof services)[number];

export const MARK = { width: 120, height: 64 } as const;

export type MarkShape =
  | { readonly kind: "path"; readonly d: string }
  | { readonly kind: "rect"; readonly x: number; readonly y: number; readonly w: number; readonly h: number }
  | { readonly kind: "dot"; readonly x: number; readonly y: number };

const r1 = (value: number) => Math.round(value * 10) / 10;
const line = (points: ReadonlyArray<readonly [number, number]>) =>
  points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${r1(x)} ${r1(y)}`).join(" ");

const SEEDS: Record<Service, number> = {
  dashboards: 11,
  apps: 23,
  telemetry: 31,
  integration: 41,
  automation: 53,
  analytics: 61,
  custom: 71,
  support: 83,
};

/** Formas de la marca de un servicio, en coordenadas de 120 × 64. */
export function markShapes(service: Service): MarkShape[] {
  const next = seededRandom(SEEDS[service]);
  const { width: w, height: h } = MARK;
  switch (service) {
    case "dashboards": {
      // Tendencia: caminata con regreso a la media.
      let value = 0.5;
      const points = Array.from({ length: 9 }, (_, i) => {
        value += (0.55 - value) * 0.3 + (next() - 0.5) * 0.4;
        return [4 + (i * (w - 8)) / 8, h - 6 - Math.min(0.95, Math.max(0.05, value)) * (h - 12)] as const;
      });
      return [{ kind: "path", d: line(points) }];
    }
    case "apps": {
      // Uso por día: barras.
      return Array.from({ length: 7 }, (_, i) => {
        const bar = 0.3 + next() * 0.65;
        return { kind: "rect", x: 6 + i * 16, y: h - 4 - bar * (h - 8), w: 10, h: bar * (h - 8) };
      });
    }
    case "telemetry": {
      // Señal continua y sus muestras.
      const signal = (x: number) => h / 2 - Math.sin((x / w) * Math.PI * 3) * (h / 2 - 10);
      const curve = Array.from({ length: 41 }, (_, i) => [(i * w) / 40, signal((i * w) / 40)] as const);
      const samples = Array.from({ length: 8 }, (_, i): MarkShape => {
        const x = 7 + (i * (w - 14)) / 7;
        return { kind: "dot", x: r1(x), y: r1(signal(x)) };
      });
      return [{ kind: "path", d: line(curve) }, ...samples];
    }
    case "integration": {
      // Tres fuentes que convergen en una sola salida (trazos ortogonales).
      const outY = h / 2;
      const sources = [10, h / 2, h - 10];
      return [
        ...sources.map(
          (y): MarkShape => ({
            kind: "path",
            d: line([
              [4, y],
              [56, y],
              [56, outY],
              [70, outY],
            ]),
          }),
        ),
        {
          kind: "path",
          d: line([
            [70, outY],
            [w - 4, outY],
          ]),
        },
      ];
    }
    case "automation": {
      // Control on/off: escalones con histéresis.
      const levels = [0.2, 0.8, 0.8, 0.2, 0.2, 0.8, 0.2, 0.8];
      const points: Array<readonly [number, number]> = [];
      levels.forEach((level, i) => {
        const y = h - 6 - level * (h - 12);
        points.push([4 + (i * (w - 8)) / levels.length, y], [4 + ((i + 1) * (w - 8)) / levels.length, y]);
      });
      return [{ kind: "path", d: line(points) }];
    }
    case "analytics": {
      // Dispersión con su recta de tendencia.
      const dots = Array.from({ length: 14 }, (): MarkShape => {
        const x = 6 + next() * (w - 12);
        const y = h - 8 - (x / w) * (h - 20) + (next() - 0.5) * 18;
        return { kind: "dot", x: r1(x), y: r1(Math.min(h - 4, Math.max(4, y))) };
      });
      return [
        ...dots,
        {
          kind: "path",
          d: line([
            [4, h - 8],
            [w - 4, 10],
          ]),
        },
      ];
    }
    case "custom": {
      // Módulos a la medida: bloques de distinto tamaño que llenan el espacio.
      const cut = 30 + next() * 30;
      const row = 20 + next() * 20;
      return [
        { kind: "rect", x: 4, y: 4, w: r1(cut), h: h - 8 },
        { kind: "rect", x: r1(cut + 8), y: 4, w: r1(w - cut - 12), h: r1(row) },
        { kind: "rect", x: r1(cut + 8), y: r1(row + 8), w: r1((w - cut - 16) / 2), h: r1(h - row - 12) },
        {
          kind: "rect",
          x: r1(cut + 12 + (w - cut - 16) / 2),
          y: r1(row + 8),
          w: r1((w - cut - 16) / 2),
          h: r1(h - row - 12),
        },
      ];
    }
    case "support": {
      // Disponibilidad: barras casi completas, una con una caída atendida.
      return Array.from({ length: 12 }, (_, i): MarkShape => {
        const level = i === 7 ? 0.55 : 0.92 + next() * 0.08;
        return { kind: "rect", x: 4 + i * 9.5, y: h - 4 - level * (h - 8), w: 6, h: level * (h - 8) };
      });
    }
  }
}
