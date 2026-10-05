"use client";

import { type ReactNode, useRef } from "react";
import { gsap } from "@/motion/gsap";
import { ease } from "@/motion/tokens";
import { useSectionMotion } from "@/motion/useSectionMotion";

/**
 * - Desktop: con el scroll (scrub) el trazo se dibuja de izquierda a derecha y cada nodo se
 *   enciende cuando el dato lo alcanza; su paso, abajo, también.
 * - Móvil: cada paso enciende su glifo al entrar en pantalla.
 * Sin JavaScript o con movimiento reducido, todo se ve completo (el CSS parte encendido).
 */
export function SignalMotion({
  thresholds,
  children,
}: {
  thresholds: readonly number[];
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);

  useSectionMotion(root, ({ desktop, mobile }) => {
    const scope = root.current;
    if (!scope || !(desktop || mobile)) return undefined;
    scope.dataset.armed = "";
    const steps = [...scope.querySelectorAll<HTMLElement>("[data-step]")];
    const nodes = [...scope.querySelectorAll<SVGGElement>("[data-diagram] [data-kind]")];

    if (desktop) {
      const trace = scope.querySelector<SVGPathElement>("[data-trace]");
      const sources = scope.querySelectorAll<SVGLineElement>("[data-source]");
      const light = (progress: number) => {
        thresholds.forEach((threshold, index) => {
          const on = progress >= threshold - 0.005;
          nodes[index]?.toggleAttribute("data-on", on);
          steps[index]?.toggleAttribute("data-on", on);
        });
      };
      gsap
        .timeline({
          scrollTrigger: {
            trigger: scope,
            start: "top 72%",
            end: "bottom 62%",
            scrub: 0.6,
            onUpdate: (self) => light(self.progress),
          },
        })
        .fromTo(sources, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.12, ease: "none" }, 0)
        .fromTo(trace, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: "none" }, 0.08);
    } else {
      for (const step of steps) {
        gsap.from(step, {
          opacity: 0.15,
          y: 18,
          duration: 0.8,
          ease: ease.out.name,
          scrollTrigger: {
            trigger: step,
            start: "top 85%",
            onEnter: () => step.setAttribute("data-on", ""),
          },
        });
      }
    }

    return () => {
      delete scope.dataset.armed;
      for (const element of [...steps, ...nodes]) element.removeAttribute("data-on");
    };
  });

  return <div ref={root}>{children}</div>;
}
