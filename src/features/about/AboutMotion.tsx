"use client";

import { SplitText } from "gsap/SplitText";
import { type ReactNode, useRef } from "react";
import { iShape, morphPolygon } from "@/motion/corte";
import { gsap, ScrollTrigger } from "@/motion/gsap";
import { angleCorte, duration, ease } from "@/motion/tokens";
import { useSectionMotion } from "@/motion/useSectionMotion";
import styles from "./about.module.css";
import { stretchFor } from "./stretch";

interface MotionProps {
  readonly className?: string;
  readonly children: ReactNode;
}

/** Ancho del que parten los nombres al entrar: condensados, cerca del límite del eje. */
const ENTRY_STRETCH = 78;
/** Tras este silencio sin eventos de scroll, la palabra vuelve a su ancho. */
const SETTLE_AFTER = 0.12;

/** Ancho de reposo que el CSS declara en `--wdth` (cambia por punto de quiebre). */
function restStretch(element: Element): number {
  return Number.parseFloat(getComputedStyle(element).getPropertyValue("--wdth")) || 100;
}

/** Apertura: en desktop, la foto de la banda se desplaza más lento que la página. */
export function IntroMotion({ className, children }: MotionProps) {
  const root = useRef<HTMLDivElement>(null);

  useSectionMotion(root, ({ desktop }) => {
    const scope = root.current;
    const media = scope?.querySelector<HTMLElement>("[data-parallax]");
    if (!desktop || !scope || !media) return undefined;
    // Parte de 0: el primer cuadro es idéntico al del servidor.
    gsap.fromTo(
      media,
      { yPercent: 0 },
      {
        yPercent: 7,
        ease: "none",
        scrollTrigger: { trigger: scope, start: "top top", end: "bottom top", scrub: true },
      },
    );
    return undefined;
  });

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}

/** Quiénes somos: la ventana se abre con el scroll desde una rendija con la forma de la I. */
export function WhoMotion({ className, children }: MotionProps) {
  const root = useRef<HTMLDivElement>(null);

  useSectionMotion(root, ({ desktop, mobile }) => {
    const slit = root.current?.querySelector<HTMLElement>("[data-slit]");
    const image = slit?.querySelector("img");
    if (!(desktop || mobile) || !slit || !image) return undefined;

    const opening = { progress: 0 };
    const draw = () => {
      const { width, height } = slit.getBoundingClientRect();
      const narrow = width * 0.03;
      const from = iShape((width - narrow) / 2, 0, narrow, height);
      slit.style.clipPath = morphPolygon(from, iShape(0, 0, width, height), opening.progress);
    };

    gsap
      .timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: slit,
          start: desktop ? "top 85%" : "top 92%",
          end: desktop ? "center 50%" : "top 40%",
          scrub: 0.6,
          invalidateOnRefresh: true,
          onRefresh: draw,
        },
      })
      .to(opening, { progress: 1, duration: 1, ease: ease.inOut.name, onUpdate: draw }, 0)
      .fromTo(image, { scale: 1.12 }, { scale: 1, duration: 1 }, 0);
    draw();

    // Al revertir (otro dispositivo o movimiento reducido) vuelve el recorte estático del CSS.
    return () => slit.style.removeProperty("clip-path");
  });

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}

/** Las letras de Visión y Misión parten condensadas al límite del eje y se pasan antes de asentarse. */
const ASSEMBLY = { from: 75, overshoot: 125 } as const;

/**
 * Ensamble de una fila de Visión y misión (scrub): cada letra sube por la máscara de la palabra
 * inclinada a 6° y condensada, se endereza pasándose de ancho y se asienta; la onda corre de
 * izquierda a derecha. Las líneas de la declaración suben por sus máscaras detrás de la palabra.
 */
function assemble(row: HTMLElement, chars: Element[], lines: Element[], rest: number, desktop: boolean) {
  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: row,
      // En móvil el tramo es más corto: la fila completa cabe en pantalla y se arma antes.
      start: desktop ? "top 92%" : "top 88%",
      end: desktop ? "center 55%" : "top 40%",
      scrub: 0.6,
    },
  });
  chars.forEach((char, index) => {
    const at = index * 0.07;
    timeline
      .fromTo(
        char,
        { yPercent: 130, skewX: -angleCorte, "--wdth": ASSEMBLY.from },
        { yPercent: 0, skewX: 0, "--wdth": ASSEMBLY.overshoot, duration: 0.5, ease: ease.out.name },
        at,
      )
      .to(char, { "--wdth": rest, duration: 0.35, ease: ease.inOut.name }, at + 0.5);
  });
  timeline.fromTo(
    lines,
    { yPercent: 100 },
    { yPercent: 0, duration: 0.6, stagger: 0.08, ease: ease.out.name },
    0.15,
  );
  return timeline;
}

/**
 * Visión y misión: el ensamble letra por letra en desktop y en móvil (en móvil, en un tramo más
 * corto). En desktop, además, la velocidad del scroll condensa la palabra entera (`--kick`, que se
 * suma al ancho de cada letra) y vuelve a cero al detenerse; en el teléfono no hay ese trabajo
 * por cuadro. SplitText se carga solo aquí y se revierte con la sección.
 */
export function PurposeMotion({ className, children }: MotionProps) {
  const root = useRef<HTMLDivElement>(null);

  useSectionMotion(root, ({ desktop, mobile }) => {
    const scope = root.current;
    if (!(desktop || mobile) || !scope) return undefined;
    gsap.registerPlugin(SplitText);

    const words: HTMLElement[] = [];
    for (const row of scope.querySelectorAll<HTMLElement>("[data-purpose]")) {
      const word = row.querySelector<HTMLElement>("[data-kinetic]");
      const statement = row.querySelector<HTMLElement>("[data-statement]");
      if (!word || !statement) continue;
      words.push(word);
      const rest = restStretch(word);
      // La palabra no se parte: sus letras se dividen una vez. El encabezado conserva su nombre con
      // aria-label (válido en un heading) y las letras quedan ocultas al lector de pantalla.
      const { chars } = SplitText.create(word, { type: "chars", charsClass: styles.char, aria: "auto" });
      // Las líneas de la declaración se vuelven a dividir si cambia el ancho o llega la fuente, y
      // con ellas el ensamble. Partir en líneas deja el texto íntegro y legible, así que no se
      // agrega aria-label (ARIA no lo permite en un párrafo).
      SplitText.create(statement, {
        type: "lines",
        mask: "lines",
        aria: "none",
        autoSplit: true,
        onSplit: (split) => assemble(row, chars, split.lines, rest, desktop),
      });
    }
    if (!desktop || words.length === 0) return undefined;

    const rest = restStretch(words[0] as HTMLElement);
    const setters = words.map((word) =>
      gsap.quickTo(word, "--kick", { duration: duration.base, ease: ease.out.name }),
    );
    const kick = (value: number) => {
      for (const set of setters) set(value);
    };
    const settle = gsap.delayedCall(SETTLE_AFTER, () => kick(0)).pause();
    ScrollTrigger.create({
      trigger: scope,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        kick(stretchFor(self.getVelocity(), rest) - rest);
        settle.restart(true);
      },
    });
    return undefined;
  });

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}

/**
 * Compromisos. Desktop: el filete de cada fila se traza y su nombre pasa de condensado a su ancho
 * al cruzar la vista (scrub). Móvil: solo el filete, una vez.
 */
export function CommitmentsMotion({ children }: { readonly children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useSectionMotion(root, ({ desktop, mobile }) => {
    const rows = root.current
      ? Array.from(root.current.querySelectorAll<HTMLElement>("[data-commitment]"))
      : [];
    if (!(desktop || mobile)) return undefined;

    for (const row of rows) {
      const rule = row.querySelector("[data-rule]");
      const name = row.querySelector("[data-name]");
      if (!rule || !name) continue;
      if (mobile) {
        gsap.fromTo(
          rule,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: duration.slow,
            scrollTrigger: { trigger: row, start: "top 90%", once: true },
          },
        );
        continue;
      }
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: row, start: "top 88%", end: "top 55%", scrub: 0.5 },
        })
        .fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0)
        .fromTo(name, { "--wdth": ENTRY_STRETCH }, { "--wdth": restStretch(name), duration: 1 }, 0);
    }
    return undefined;
  });

  return <div ref={root}>{children}</div>;
}
