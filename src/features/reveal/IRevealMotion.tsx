"use client";

import { type ReactNode, useRef } from "react";
import { iShape, morphPolygon } from "@/motion/corte";
import { gsap } from "@/motion/gsap";
import { ease, tanCorte } from "@/motion/tokens";
import { useSectionMotion } from "@/motion/useSectionMotion";

/**
 * Escena fijada de "La I que se abre". Con el scroll (scrub):
 * - la ventana pasa de la forma exacta de la I del titular a cubrir la pantalla;
 * - el titular se abre alrededor de la I y se desvanece;
 * - la sombra sobre la foto se aclara.
 * Solo con movimiento: `data-ready` cambia el CSS a la escena fijada; al revertir (cambio de
 * dispositivo o movimiento reducido) vuelve la composición estática.
 */
export function IRevealMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useSectionMotion(root, ({ desktop, mobile }) => {
    const scope = root.current;
    if (!scope || !(desktop || mobile)) return undefined;
    const stage = scope.querySelector<HTMLElement>("[data-stage]");
    const view = scope.querySelector<HTMLElement>("[data-window]");
    const title = scope.querySelector<HTMLElement>("[data-title]");
    const portal = scope.querySelector<HTMLElement>("[data-portal]");
    const shade = view?.lastElementChild ?? null;
    if (!stage || !view || !title || !portal) return undefined;

    scope.dataset.ready = "";
    const reveal = { progress: 0 };
    const draw = () => {
      const bounds = stage.getBoundingClientRect();
      const letter = portal.getBoundingClientRect();
      const from = iShape(letter.left - bounds.left, letter.top - bounds.top, letter.width, letter.height);
      const overhang = bounds.height * tanCorte;
      const to = iShape(-overhang, 0, bounds.width + 2 * overhang, bounds.height);
      view.style.clipPath = morphPolygon(from, to, reveal.progress);
    };

    const letterBox = portal.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    gsap.set(title, {
      transformOrigin: `${letterBox.left - titleBox.left + letterBox.width / 2}px ${letterBox.top - titleBox.top + letterBox.height / 2}px`,
    });

    gsap
      .timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          // En móvil el recorrido es más corto: la escena pesa menos en una home vertical.
          end: desktop ? "+=170%" : "+=100%",
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onRefresh: draw,
        },
      })
      .to(reveal, { progress: 1, duration: 1, ease: ease.inOut.name, onUpdate: draw }, 0.1)
      .to(title, { scale: 1.2, opacity: 0, duration: 0.55, ease: ease.in.name }, 0.1)
      .to(shade, { opacity: 0.3, duration: 0.8 }, 0.3)
      .to({}, { duration: 0.2 });
    draw();

    return () => {
      delete scope.dataset.ready;
      view.style.removeProperty("clip-path");
    };
  });

  return <div ref={root}>{children}</div>;
}
