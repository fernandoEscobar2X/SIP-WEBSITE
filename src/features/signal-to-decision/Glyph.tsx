import styles from "./signal.module.css";

export type StepKind = "signal" | "integration" | "dashboard" | "alert" | "action";

/**
 * Glifo de cada paso, dibujado con el lenguaje del sitio (sin íconos de librería): la forma del
 * dato que circula en ese paso. Centrado en (cx, cy) dentro de un nodo de radio 22.
 */
export function Glyph({ kind, cx, cy }: { kind: StepKind; cx: number; cy: number }) {
  const at = (x: number, y: number) => `${cx + x} ${cy + y}`;
  return (
    <g className={styles.node} data-kind={kind}>
      <circle className={styles.nodeRing} cx={cx} cy={cy} r={22} />
      {kind === "signal" ? (
        <path className={styles.glyph} d={`M${at(-12, 0)} Q${at(-6, -10)} ${at(0, 0)} T${at(12, 0)}`} />
      ) : null}
      {kind === "integration" ? (
        <path
          className={styles.glyph}
          d={`M${at(-11, -9)} L${at(-2, 0)} M${at(-11, 0)} L${at(-2, 0)} M${at(-11, 9)} L${at(-2, 0)} L${at(11, 0)}`}
        />
      ) : null}
      {kind === "dashboard" ? (
        <>
          <rect className={styles.glyph} x={cx - 12} y={cy - 9} width={24} height={18} rx={2} />
          <path className={styles.glyph} d={`M${at(-8, 4)} L${at(-3, -1)} L${at(1, 2)} L${at(8, -5)}`} />
        </>
      ) : null}
      {kind === "alert" ? (
        <path
          className={styles.glyph}
          d={`M${at(0, -11)} L${at(11, 9)} L${at(-11, 9)} Z M${at(0, -3)} L${at(0, 3)}`}
        />
      ) : null}
      {kind === "action" ? (
        <path className={styles.glyph} d={`M${at(-9, 0)} L${at(-3, 7)} L${at(10, -7)}`} />
      ) : null}
    </g>
  );
}
