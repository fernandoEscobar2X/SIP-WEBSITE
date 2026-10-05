"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { datatype } from "@/lib/simulated";
import { gsap } from "@/motion/gsap";
import { ease } from "@/motion/tokens";
import { useSectionMotion } from "@/motion/useSectionMotion";
import { createReadings } from "./readings";

interface ManifestoMotionProps {
  readonly seed: number;
  readonly timeZone: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/** Ritmo de las lecturas simuladas: un dato nuevo cada tanto, como una línea real. */
const READING_MS = 1600;

/**
 * - Con el scroll (scrub), cada palabra pasa de acero a noche (`--lit` de 0 a 1; el CSS mezcla
 *   los colores de los tokens). Al llegar a una palabra clave, su gráfica se descubre.
 * - Mientras la sección está a la vista, los datos se actualizan: la línea y las barras con las
 *   lecturas simuladas, y "tiempo real" con la hora de Tijuana al segundo.
 */
export function ManifestoMotion({ seed, timeZone, className, children }: ManifestoMotionProps) {
  const root = useRef<HTMLDivElement>(null);

  useSectionMotion(root, ({ desktop, mobile }) => {
    const scope = root.current;
    if (!scope || !(desktop || mobile)) return undefined;
    const text = scope.querySelector<HTMLElement>("[data-manifesto-text]");
    const words = scope.querySelectorAll<HTMLElement>("[data-word]");
    gsap
      .timeline({
        scrollTrigger: {
          trigger: text ?? scope,
          start: desktop ? "top 78%" : "top 85%",
          end: desktop ? "bottom 45%" : "bottom 60%",
          scrub: 0.6,
        },
      })
      .to(words, { "--lit": 1, duration: 0.35, stagger: 0.1, ease: "none" });

    // La placa (solo desktop) se arma fila por fila, como un equipo que reporta al encenderse.
    const plate = scope.querySelector<HTMLElement>("[data-plate]");
    const rows = scope.querySelectorAll<HTMLElement>("[data-plate-row]");
    if (desktop && plate) {
      gsap
        .timeline({ scrollTrigger: { trigger: plate, start: "top 88%" } })
        .from(plate, { "--plate-rule": 0, duration: 0.9, ease: ease.out.name })
        .from(rows, { opacity: 0, y: 14, duration: 0.7, stagger: 0.08, ease: ease.out.name }, 0.15);
    }
    return undefined;
  });

  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    const line = scope.querySelector<HTMLElement>('[data-datum="line"]');
    const bars = scope.querySelector<HTMLElement>('[data-datum="bars"]');
    const clock = scope.querySelector<HTMLElement>('[data-datum="clock"]');
    const source = createReadings({ seed });
    const time = new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZone,
    });

    let readings = 0;
    let ticker = 0;
    const tick = () => {
      if (clock) clock.textContent = time.format(new Date());
    };
    const read = () => {
      const { throughput, lines } = source.step();
      if (line) line.textContent = datatype.line(throughput);
      if (bars) bars.textContent = datatype.bars(lines);
    };
    const start = () => {
      if (ticker) return;
      tick();
      ticker = window.setInterval(tick, 1000);
      readings = window.setInterval(read, READING_MS);
    };
    const stop = () => {
      window.clearInterval(ticker);
      window.clearInterval(readings);
      ticker = 0;
      readings = 0;
    };
    // Solo se actualiza lo que se ve: fuera de pantalla no hay trabajo.
    const observer = new IntersectionObserver(([entry]) => (entry?.isIntersecting ? start() : stop()));
    observer.observe(scope);
    tick();
    return () => {
      observer.disconnect();
      stop();
    };
  }, [seed, timeZone]);

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
