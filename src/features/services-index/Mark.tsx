import { MARK, markShapes, type Service } from "./marks";
import styles from "./services.module.css";

/**
 * La marca de un servicio: la forma de su propio dato (sin íconos). Decorativa. `dot` es el radio
 * de las muestras en unidades de la marca: en tamaño grande van más finas.
 */
export function Mark({
  service,
  className,
  dot = 2.6,
}: {
  service: Service;
  className?: string;
  dot?: number;
}) {
  return (
    <svg
      className={[styles.mark, className].filter(Boolean).join(" ")}
      viewBox={`0 0 ${MARK.width} ${MARK.height}`}
      aria-hidden="true"
      data-service={service}
    >
      {markShapes(service).map((shape, index) => {
        const key = `${service}-${index}`;
        if (shape.kind === "path")
          return <path key={key} className={styles.markLine} d={shape.d} pathLength={1} />;
        if (shape.kind === "dot")
          return <circle key={key} className={styles.markDot} cx={shape.x} cy={shape.y} r={dot} />;
        return (
          <rect
            key={key}
            className={styles.markBlock}
            x={shape.x}
            y={shape.y}
            width={shape.w}
            height={shape.h}
            rx={1.5}
          />
        );
      })}
    </svg>
  );
}
