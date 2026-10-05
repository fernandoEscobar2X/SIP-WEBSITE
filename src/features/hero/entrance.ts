import { ease } from "@/motion/tokens";

/**
 * Entrada del hero con la Web Animations API.
 *
 * En la carga inicial la dispara un script en línea al final del hero, en cuanto el navegador lo
 * lee: no espera a la hidratación de React (en un teléfono de gama media llega segundos después
 * del primer pintado). En una navegación del lado del cliente ese script no se ejecuta, así que
 * HeroCarousel la dispara al montarse (`entrancePending`).
 *
 * Coreografía: las líneas del titular suben por su máscara mientras la fuente se asienta en su eje
 * de ancho; luego el texto y el CTA, las industrias en cascada, y la imagen que se asienta. Espera
 * a la fuente del titular (con tope) para que el eje de ancho se anime en Hubot.
 *
 * `playEntrance` es autocontenida (sin referencias externas) porque también se serializa como
 * texto para el script en línea.
 */
export function playEntrance(hero: Element, easing: string, fontWaitMs: number): void {
  if (document.documentElement.dataset.motion !== "on") return;
  const all = (selector: string) => Array.from(hero.querySelectorAll<HTMLElement>(selector));
  const lines = all('[data-entrance="line"]');
  const blocks = all('[data-entrance="block"]');
  const controls = all('[data-entrance="controls"]');
  const tabs = all('[role="tab"]');
  const stage = all('[data-entrance="stage"]');
  const safetyNet = lines.concat(blocks, controls);
  if (safetyNet.length === 0 || typeof safetyNet[0]?.animate !== "function") return;

  const play = () => {
    for (const element of safetyNet) for (const animation of element.getAnimations()) animation.cancel();
    const title = lines[0]?.closest("h1");
    const wide = title ? getComputedStyle(title).fontStretch : "100%";
    const hold = { easing, fill: "backwards" } as const;
    for (const element of stage) {
      element.animate([{ transform: "scale(1.06)" }, { transform: "none" }], { duration: 2400, easing });
    }
    lines.forEach((element, index) => {
      element.animate(
        [
          { transform: "translateY(115%)", fontStretch: "78%" },
          { transform: "none", fontStretch: wide },
        ],
        { ...hold, duration: 1300, delay: 100 + index * 120 },
      );
    });
    // El párrafo es el LCP en móvil (Chrome no cuenta la foto a pantalla completa): parte de 0.1,
    // nunca de 0, para que su primer pintado cuente desde el inicio.
    for (const element of blocks) {
      element.animate(
        [
          { opacity: 0.1, transform: "translateY(28px)" },
          { opacity: 1, transform: "none" },
        ],
        { ...hold, duration: 1100, delay: 300 },
      );
    }
    for (const element of controls) {
      element.animate([{ opacity: 0.1 }, { opacity: 1 }], { ...hold, duration: 500, delay: 500 });
    }
    tabs.forEach((element, index) => {
      element.animate(
        [
          { opacity: 0, transform: "translateX(-16px)" },
          { opacity: 1, transform: "none" },
        ],
        { ...hold, duration: 900, delay: 500 + index * 60 },
      );
    });
  };

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    play();
  };
  if (document.fonts && document.fonts.status !== "loaded") {
    void document.fonts.ready.then(start);
    window.setTimeout(start, fontWaitMs);
  } else {
    start();
  }
}

/**
 * ¿La entrada sigue pendiente? Lo está si la red de seguridad CSS de las líneas sigue viva y
 * todavía en su espera (nadie la canceló ni empezó a revelar).
 */
export function entrancePending(hero: Element): boolean {
  return Array.from(hero.querySelectorAll('[data-entrance="line"]')).some((element) =>
    element
      .getAnimations()
      .some(
        (animation) =>
          animation instanceof CSSAnimation &&
          Number(animation.currentTime ?? 0) < Number(animation.effect?.getTiming().delay ?? 0),
      ),
  );
}

export const ENTRANCE_EASE = `cubic-bezier(${ease.out.bezier.join(",")})`;
export const FONT_WAIT_MS = 700;

/** Script en línea: la misma función, serializada, aplicada al hero que la contiene. */
export const entranceScript = `(${playEntrance.toString()})(document.currentScript.closest("section"),${JSON.stringify(
  ENTRANCE_EASE,
)},${FONT_WAIT_MS});`;
