import { getTranslations } from "next-intl/server";
import { traceThrough } from "@/components/brand/trace";
import { Glyph, type StepKind } from "./Glyph";
import { SignalMotion } from "./SignalMotion";
import styles from "./signal.module.css";

const STEPS: readonly StepKind[] = ["signal", "integration", "dashboard", "alert", "action"];

/**
 * Diagrama de desktop (1200 × 200): cada paso ocupa una columna y su nodo queda cerca del borde
 * izquierdo, alineado con el texto de abajo. El trazo de la marca pasa por los cinco nodos
 * alternando altura, con giros redondeados.
 */
const NODES = [
  { x: 40, y: 150 },
  { x: 280, y: 90 },
  { x: 520, y: 150 },
  { x: 760, y: 90 },
  { x: 1000, y: 150 },
] as const;
const TRACE = traceThrough(
  [
    { x: 0, y: 150 },
    { x: 160, y: 150 },
    { x: 160, y: 90 },
    { x: 400, y: 90 },
    { x: 400, y: 150 },
    { x: 640, y: 150 },
    { x: 640, y: 90 },
    { x: 880, y: 90 },
    { x: 880, y: 150 },
    { x: 1200, y: 150 },
  ],
  24,
);
/** Fuentes que llegan a la integración. */
const SOURCES = [
  { x: 250, tag: "ERP" },
  { x: 280, tag: "PLC" },
  { x: 310, tag: "CSV" },
] as const;

/**
 * "Señal → dato → decisión": cómo trabaja SIP. Al cruzar la pantalla, el trazo de la marca lleva
 * el dato de nodo en nodo (sin fijar la sección: la home se mantiene corta). En móvil cada paso
 * trae su propio glifo, sin una línea continua al costado.
 */
export async function SignalToDecision() {
  const t = await getTranslations("Signal");
  return (
    <section data-surface="hielo" className={styles.section} aria-labelledby="como-titulo">
      <div className="container-site">
        <header className={styles.header}>
          <h2 id="como-titulo" className={styles.title}>
            {t("title")}
          </h2>
          <p className={styles.lead}>{t("lead")}</p>
        </header>
        <SignalMotion thresholds={NODES.map((node) => node.x / 1200)}>
          <svg className={styles.diagram} viewBox="0 0 1200 200" aria-hidden="true" data-diagram>
            {SOURCES.map(({ x, tag }) => (
              <g key={tag}>
                <text className={styles.source} x={x} y={12}>
                  {tag}
                </text>
                <line
                  className={styles.sourceLine}
                  x1={x}
                  y1={20}
                  x2={x}
                  y2={68}
                  pathLength={1}
                  data-source
                />
              </g>
            ))}
            <path className={styles.trace} d={TRACE} pathLength={1} data-trace />
            {STEPS.map((kind, index) => {
              const node = NODES[index] as { x: number; y: number };
              return <Glyph key={kind} kind={kind} cx={node.x} cy={node.y} />;
            })}
          </svg>
          <ol className={styles.steps}>
            {STEPS.map((kind) => (
              <li key={kind} className={styles.step} data-step={kind}>
                <svg className={styles.stepGlyph} viewBox="0 0 56 56" aria-hidden="true">
                  <Glyph kind={kind} cx={28} cy={28} />
                </svg>
                <h3 className={styles.stepName}>{t(`steps.${kind}.name`)}</h3>
                <p className={styles.stepText}>{t(`steps.${kind}.text`)}</p>
              </li>
            ))}
          </ol>
        </SignalMotion>
      </div>
    </section>
  );
}
