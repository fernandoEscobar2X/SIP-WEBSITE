"use client";

import type { Flip as FlipPlugin } from "gsap/Flip";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { gsap } from "@/motion/gsap";
import { prefersReducedMotion, useMediaQuery } from "@/motion/media";
import { breakpoints, duration, ease } from "@/motion/tokens";
import { WhatsAppGlyph } from "./WhatsAppGlyph";
import styles from "./whatsapp.module.css";

type Labels = { label: string; title: string; close: string; openInApp: string };

type Props = {
  href: string;
  number: string;
  labels: Labels;
  /** QR renderizado en servidor: no viaja en el bundle de JS. */
  qr: ReactNode;
};

/**
 * Desktop con puntero fino: el botón se transforma (GSAP Flip) en un panel pequeño
 * con el QR, sin cubrir la página. Sin JS o con pantalla táctil: enlace directo a wa.me.
 */
export function WhatsAppDock({ href, number, labels, qr }: Props) {
  const interactive = useMediaQuery(`${breakpoints.desktop} and ${breakpoints.finePointer}`);
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const flipRef = useRef<typeof FlipPlugin | null>(null);
  const titleId = useId();

  const loadFlip = useCallback(async () => {
    if (flipRef.current) return flipRef.current;
    const { Flip } = await import("gsap/Flip");
    gsap.registerPlugin(Flip);
    flipRef.current = Flip;
    return Flip;
  }, []);

  /**
   * Cambia de forma (Flip: el mismo contenedor pasa de botón a panel) y mueve el
   * foco en el mismo paso: al abrir va a "Cerrar", al cerrar vuelve al botón.
   * flushSync aplica el DOM de inmediato, así los refs ya apuntan al elemento nuevo.
   */
  const toggle = useCallback(
    async (next: boolean) => {
      const shell = shellRef.current;
      const Flip = shell && !prefersReducedMotion() ? await loadFlip() : null;
      const state = Flip && shell ? Flip.getState(shell) : null;

      flushSync(() => setOpen(next));
      (next ? closeRef : triggerRef).current?.focus();

      if (!Flip || !state || !shell) return;
      Flip.from(state, { duration: duration.base, ease: ease.out.name });
      // Solo opacidad: el contenido sigue siendo enfocable durante el fundido.
      gsap.fromTo(
        shell.firstElementChild,
        { opacity: 0, y: next ? 8 : 0 },
        { opacity: 1, y: 0, duration: duration.base, delay: duration.fast * 0.6 },
      );
    },
    [loadFlip],
  );

  const close = useCallback(() => toggle(false), [toggle]);

  // Esc y clic fuera cierran el panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onPointer = (e: PointerEvent) => {
      if (shellRef.current && !shellRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  return (
    <div className={styles.root}>
      <div ref={shellRef} className={styles.shell} data-open={open}>
        {open ? (
          <div role="dialog" aria-modal="false" aria-labelledby={titleId} className={styles.panel}>
            <div className={styles.panelHeader}>
              <p id={titleId} className={styles.title}>
                {labels.title}
              </p>
              <button ref={closeRef} type="button" className={styles.close} onClick={close}>
                {labels.close}
              </button>
            </div>
            <div className={styles.qr}>{qr}</div>
            <a className={styles.number} href={href} target="_blank" rel="noopener noreferrer">
              {number}
            </a>
            <a className={styles.appLink} href={href} target="_blank" rel="noopener noreferrer">
              {labels.openInApp}
            </a>
          </div>
        ) : interactive ? (
          <button
            ref={triggerRef}
            type="button"
            className={styles.trigger}
            aria-label={labels.label}
            aria-expanded={false}
            aria-haspopup="dialog"
            onClick={() => toggle(true)}
            onPointerEnter={loadFlip}
            onFocus={loadFlip}
          >
            <WhatsAppGlyph className={styles.glyph} />
          </button>
        ) : (
          <a
            className={styles.trigger}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={labels.label}
          >
            <WhatsAppGlyph className={styles.glyph} />
          </a>
        )}
      </div>
    </div>
  );
}
