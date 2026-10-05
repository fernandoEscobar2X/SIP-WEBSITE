/**
 * Lecturas simuladas del manifiesto: la producción de una planta (sparkline) y la carga de sus
 * líneas (barras), que Datatype dibuja dentro del texto. Deterministas con semilla: la misma
 * semilla da la misma serie en el servidor, en el navegador y en las pruebas.
 *
 * Cuando haya datos reales, se reemplaza esta fuente sin tocar la vista.
 */

import { seededRandom } from "@/lib/simulated";

export interface ReadingsSnapshot {
  /** Producción por intervalo, normalizada 0–100 (para una sparkline). */
  readonly throughput: readonly number[];
  /** Carga de cada línea, 0–100 (para barras). */
  readonly lines: readonly number[];
}

export interface Readings {
  snapshot(): ReadingsSnapshot;
  /** Avanza un intervalo: entra una lectura nueva y sale la más vieja. */
  step(): ReadingsSnapshot;
}

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function createReadings({ seed = 7, points = 8, lines = 6 } = {}): Readings {
  const random = seededRandom(seed);
  // Caminata aleatoria con regreso a la media: se mueve como una línea de producción real.
  const next = (previous: number, mean: number, spread: number) =>
    clamp(previous + (mean - previous) * 0.35 + (random() - 0.5) * spread);

  let throughput: number[] = [];
  let value = 62;
  for (let i = 0; i < points; i++) {
    value = next(value, 68, 26);
    throughput.push(value);
  }
  let load = Array.from({ length: lines }, () => clamp(45 + random() * 45));

  const snapshot = (): ReadingsSnapshot => ({ throughput: [...throughput], lines: [...load] });

  return {
    snapshot,
    step() {
      throughput = [...throughput.slice(1), next(throughput.at(-1) ?? 60, 68, 26)];
      load = load.map((current) => next(current, 70, 22));
      return snapshot();
    },
  };
}
