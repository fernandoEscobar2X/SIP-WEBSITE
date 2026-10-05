"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { gsap } from "@/motion/gsap";
import { usePrefersReducedMotion } from "@/motion/media";
import { angleCorte, duration, ease, tanCorte } from "@/motion/tokens";
import { useSectionMotion } from "@/motion/useSectionMotion";
import { ENTRANCE_EASE, entrancePending, FONT_WAIT_MS, playEntrance } from "./entrance";
import styles from "./hero.module.css";

export interface HeroSlide {
  readonly id: string;
  readonly name: string;
  readonly measure: string;
}

interface HeroCarouselProps {
  readonly slides: readonly HeroSlide[];
  readonly labels: { carousel: string; industries: string };
  /** Paneles renderizados en servidor (uno por industria, con `data-slide`). */
  readonly children: ReactNode;
}

/** Tiempo de cada industria en el recorrido automático. */
const SLIDE_SECONDS = 7;
const SWIPE_DISTANCE = 48;
/** Espera máxima por la foto entrante: la precarga suele dejarla lista, y nunca se bloquea el corte. */
const DECODE_TIMEOUT = 350;
/** Tope por foto en la precarga de fondo (una red muy lenta no detiene la cola). */
const PREFETCH_TIMEOUT = 10_000;
const CUT_SECONDS = 1.05;

type Direction = 1 | -1;

/**
 * Estados de un panel (atributo `data-state`):
 * - "active": el que se ve;
 * - "incoming": el que entra con el corte, encima del activo;
 * - "prepared": montado y con su foto cargada, pero sin pintar (visibility: hidden);
 * - sin estado: `hidden`, su foto aún no se descarga.
 */
type PanelState = "active" | "incoming" | "prepared";

function visibleImage(panel: HTMLElement): HTMLImageElement | undefined {
  return [...panel.querySelectorAll("img")].find((img) => img.getClientRects().length > 0);
}

function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Monta el panel y pide su foto de inmediato (las fotos del hero son `loading="lazy"`). */
function mount(panel: HTMLElement, state: PanelState): HTMLImageElement | undefined {
  panel.hidden = false;
  panel.dataset.state = state;
  const img = visibleImage(panel);
  if (img) img.loading = "eager";
  return img;
}

function isLoaded(img: HTMLImageElement | undefined): boolean {
  return !img || (img.complete && img.naturalWidth > 0);
}

async function whenLoaded(img: HTMLImageElement | undefined, limit: number): Promise<void> {
  if (!img || isLoaded(img)) return;
  await Promise.race([img.decode().catch(() => undefined), timeout(limit)]);
}

/**
 * Recorrido por industrias (patrón de carrusel con pestañas de WAI-ARIA):
 * - cambia con el corte de la I (6°) y su filo en azul señal;
 * - avanza solo, con el progreso en la pill activa; se detiene con el cursor encima, con el
 *   foco dentro, fuera de pantalla, con la pestaña oculta o con movimiento reducido;
 * - flechas, Inicio y Fin en las pestañas; swipe horizontal en pantallas táctiles.
 */
export function HeroCarousel({ slides, labels, children }: HeroCarouselProps) {
  const root = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  /** Industria pedida (la última) y la que está en pantalla. */
  const requested = useRef(0);
  const shown = useRef(0);
  /** Cada pedido lleva un número: si llega otro mientras se espera la foto, el anterior se descarta. */
  const requestId = useRef(0);
  const transition = useRef<gsap.core.Timeline | null>(null);
  const timer = useRef<gsap.core.Tween | null>(null);
  /** Detenido por el visitante o por contexto; lo hereda el temporizador de cada industria. */
  const stopped = useRef(true);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const [active, setActive] = useState(0);
  // Con movimiento reducido el recorrido no avanza solo: se elige industria a mano.
  const paused = usePrefersReducedMotion();
  const [held, setHeld] = useState(false);
  const count = slides.length;

  const panel = useCallback(
    (index: number) => root.current?.querySelector<HTMLElement>(`[data-slide="${index}"]`) ?? null,
    [],
  );

  const panels = useCallback(
    () => [...(root.current?.querySelectorAll<HTMLElement>("[data-slide]") ?? [])],
    [],
  );

  /** Cierra un corte: el entrante queda activo y el resto de lo montado, preparado y sin pintar. */
  const settle = useCallback(
    (incoming: HTMLElement, target: number) => {
      for (const element of panels()) {
        if (element === incoming) element.dataset.state = "active";
        else if (!element.hidden) element.dataset.state = "prepared";
      }
      gsap.set([...panels(), ...(root.current?.querySelectorAll("[data-slide] img") ?? [])], {
        clearProps: "all",
      });
      gsap.set(edgeRef.current, { opacity: 0 });
      shown.current = target;
    },
    [panels],
  );

  /**
   * Cambia de industria. La pill responde al instante; si hay un corte en curso se completa de
   * golpe y el nuevo arranca desde ahí (la imagen sigue al último pedido, sin cola ni retraso).
   */
  const go = useCallback(
    async (target: number, direction: Direction) => {
      const id = ++requestId.current;
      requested.current = target;
      setActive(target);
      transition.current?.progress(1);
      transition.current = null;
      // Un pedido anterior que quedó esperando su foto se retira.
      for (const element of panels()) {
        if (element.dataset.state === "incoming") {
          element.dataset.state = "prepared";
          gsap.set(element, { clearProps: "all" });
        }
      }

      const from = shown.current;
      const incoming = panel(target);
      const outgoing = panel(from);
      const media = mediaRef.current;
      if (target === from || !incoming || !outgoing || !media) return;

      const { width, height } = media.getBoundingClientRect();
      const lean = ((height * tanCorte) / width) * 100;
      const cut = { progress: 0 };
      const draw = () => {
        // Borde del corte: arriba en `top`, abajo `lean` más a la izquierda (la I inclinada).
        const top = direction === 1 ? (100 + lean) * (1 - cut.progress) : (100 + lean) * cut.progress;
        const bottom = top - lean;
        incoming.style.clipPath =
          direction === 1
            ? `polygon(${top}% 0%, 100% 0%, 100% 100%, ${bottom}% 100%)`
            : `polygon(0% 0%, ${top}% 0%, ${bottom}% 100%, 0% 100%)`;
        gsap.set(edgeRef.current, { x: (top / 100) * width, skewX: -angleCorte });
      };
      // Se recorta antes de mostrarse: nunca aparece completo ni un cuadro.
      draw();
      const img = mount(incoming, "incoming");
      await whenLoaded(img, DECODE_TIMEOUT);
      if (id !== requestId.current) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        settle(incoming, target);
        return;
      }
      transition.current = gsap
        .timeline({ onComplete: () => settle(incoming, target) })
        .set(edgeRef.current, { opacity: 1 })
        .to(cut, { progress: 1, duration: CUT_SECONDS, ease: ease.inOut.name, onUpdate: draw }, 0)
        .fromTo(
          incoming.querySelectorAll("img"),
          { scale: 1.06 },
          { scale: 1, duration: 1.6, ease: ease.out.name },
          0,
        )
        .to(
          outgoing.querySelectorAll("img"),
          { xPercent: -3 * direction, duration: CUT_SECONDS, ease: ease.inOut.name },
          0,
        )
        .to(edgeRef.current, { opacity: 0, duration: duration.fast }, CUT_SECONDS - 0.1);
    },
    [panel, panels, settle],
  );

  const step = useCallback(
    (direction: Direction) => go((requested.current + direction + count) % count, direction),
    [go, count],
  );

  // Temporizador del recorrido: el progreso se pinta en la pill activa.
  useEffect(() => {
    const tabs = tabRefs.current;
    for (const tab of tabs) tab?.style.setProperty("--progress", "0");
    const proxy = { value: 0 };
    const tween = gsap.to(proxy, {
      value: 1,
      duration: SLIDE_SECONDS,
      ease: "none",
      paused: stopped.current,
      onUpdate: () => tabs[active]?.style.setProperty("--progress", proxy.value.toFixed(4)),
      onComplete: () => void step(1),
    });
    timer.current = tween;
    return () => {
      tween.kill();
    };
  }, [active, step]);

  useEffect(() => {
    stopped.current = paused || held;
    timer.current?.paused(stopped.current);
  }, [paused, held]);

  // Se detiene fuera de pantalla, con la pestaña oculta, con el cursor encima o con el foco dentro.
  useEffect(() => {
    const section = root.current?.parentElement?.closest("section");
    if (!section) return;
    const reasons = new Set<string>();
    const hold = (reason: string, on: boolean) => {
      if (on) reasons.add(reason);
      else reasons.delete(reason);
      setHeld(reasons.size > 0);
    };
    const observer = new IntersectionObserver(([entry]) => hold("fuera", !entry?.isIntersecting), {
      threshold: 0.25,
    });
    observer.observe(section);
    const onVisibility = () => hold("oculta", document.hidden);
    const onEnter = (event: globalThis.PointerEvent) => event.pointerType === "mouse" && hold("cursor", true);
    const onLeave = (event: globalThis.PointerEvent) =>
      event.pointerType === "mouse" && hold("cursor", false);
    const onFocusIn = () => hold("foco", true);
    const onFocusOut = (event: FocusEvent) => {
      if (!section.contains(event.relatedTarget as Node | null)) hold("foco", false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    section.addEventListener("pointerenter", onEnter);
    section.addEventListener("pointerleave", onLeave);
    section.addEventListener("focusin", onFocusIn);
    section.addEventListener("focusout", onFocusOut);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      section.removeEventListener("pointerenter", onEnter);
      section.removeEventListener("pointerleave", onLeave);
      section.removeEventListener("focusin", onFocusIn);
      section.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // Precarga de las demás industrias cuando la página ya cargó (no compite con el LCP): una por
  // una, en el orden del recorrido, montadas sin pintar. Con ahorro de datos, solo la siguiente.
  useEffect(() => {
    let cancelled = false;
    let idle = 0;
    const prefetch = async () => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const pending = connection?.saveData ? 1 : count - 1;
      for (let offset = 1; offset <= pending && !cancelled; offset++) {
        const element = panel((shown.current + offset) % count);
        if (!element || element.dataset.state) continue;
        await whenLoaded(mount(element, "prepared"), PREFETCH_TIMEOUT);
      }
    };
    const begin = () => {
      idle = window.setTimeout(() => void prefetch(), 400);
    };
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });
    return () => {
      cancelled = true;
      window.clearTimeout(idle);
      window.removeEventListener("load", begin);
    };
  }, [panel, count]);

  // Al desmontar (por ejemplo, al cambiar de idioma) se corta el cambio en curso y se retira el
  // que esperaba su foto: al resolverse ya no tendría dónde dibujarse. Va en un efecto de layout
  // porque su limpieza corre antes de que React desconecte las referencias; la de `useEffect`
  // llega después, y en ese cuadro el corte animaría un borde que ya no existe.
  useLayoutEffect(
    () => () => {
      requestId.current += 1;
      transition.current?.kill();
    },
    [],
  );

  // En navegación del lado del cliente el script en línea de la entrada no se ejecuta: se dispara aquí.
  useEffect(() => {
    const hero = root.current?.parentElement?.closest("section");
    if (hero && entrancePending(hero)) playEntrance(hero, ENTRANCE_EASE, FONT_WAIT_MS);
  }, []);

  // Parallax de la imagen con el scroll: el scroll es tiempo (más contenido en móvil).
  useSectionMotion(root, ({ desktop, mobile }) => {
    const section = root.current?.parentElement?.closest("section");
    if (!section || !(desktop || mobile)) return undefined;
    gsap.to(mediaRef.current, {
      yPercent: desktop ? 14 : 8,
      ease: "none",
      scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
    });
    return undefined;
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, readonly [number, Direction]> = {
      ArrowRight: [(active + 1) % count, 1],
      ArrowLeft: [(active - 1 + count) % count, -1],
      Home: [0, -1],
      End: [count - 1, 1],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const [target, direction] = move;
    tabRefs.current[target]?.focus();
    void go(target, direction);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") swipe.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.4) void step(dx < 0 ? 1 : -1);
  };

  const current = slides[active];

  return (
    <section ref={root} aria-roledescription={labels.carousel} aria-label={labels.industries}>
      <div
        ref={mediaRef}
        className={styles.media}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        <div className={styles.stage} data-entrance="stage" aria-live={paused ? "polite" : "off"}>
          {children}
        </div>
        <div ref={edgeRef} className={styles.edge} aria-hidden="true" />
      </div>

      <div className="container-site">
        <div className={`${styles.controls} ${styles.reveal}`} data-entrance="controls">
          <div role="tablist" aria-label={labels.industries} className={styles.tabs} onKeyDown={onKeyDown}>
            {slides.map(({ id, name }, index) => (
              <button
                key={id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`hero-tab-${id}`}
                aria-selected={index === active}
                aria-controls={`hero-${id}`}
                tabIndex={index === active ? 0 : -1}
                className={styles.tab}
                onClick={() => void go(index, index > active ? 1 : -1)}
              >
                {name}
              </button>
            ))}
          </div>
          {current ? (
            <p key={current.id} className={styles.measure} aria-hidden="true">
              {current.measure}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
