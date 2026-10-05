"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Cta } from "@/components/ui/Cta";
import type { Locale } from "@/i18n/routing";
import { TransitionLink } from "@/motion/transitions/TransitionLink";
import { PAGE_REVEALED_EVENT } from "@/motion/transitions/TransitionProvider";
import styles from "./chrome.module.css";
import { LanguageSwitch } from "./LanguageSwitch";

export type NavItem = { href: string; label: string };

type Props = {
  homeHref: string;
  homeLabel: string;
  navLabel: string;
  items: NavItem[];
  cta: NavItem;
  language: { to: Locale; label: string };
};

/** Umbral en px antes de ocultar el header al bajar. */
const HIDE_AFTER = 120;

type Tone = "dark" | "light";

/**
 * Tono de la superficie que queda justo debajo del header: la primera capa del punto de prueba
 * que pertenece a una sección con `data-surface` (se ignoran el propio header y cualquier capa
 * flotante sin superficie).
 */
function toneUnder(header: HTMLElement): Tone {
  const probeY = header.offsetHeight / 2;
  for (const element of document.elementsFromPoint(window.innerWidth / 2, probeY)) {
    if (header.contains(element)) continue;
    const surface = element.closest<HTMLElement>("[data-surface]")?.dataset.surface;
    if (surface) return surface === "hielo" || surface === "blanco" ? "light" : "dark";
  }
  return "dark";
}

/**
 * Header: transparente sobre el hero, sólido al hacer scroll; se oculta al bajar
 * y reaparece al subir para no robar pantalla. En móvil solo logo + idioma
 * (la navegación vive en el dock inferior, al alcance del pulgar).
 */
export function Header({ homeHref, homeLabel, navLabel, items, cta, language }: Props) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [tone, setTone] = useState<Tone>("dark");
  const last = useRef(0);

  // Se recalcula al hacer scroll y al cambiar de página (la nueva página puede empezar clara).
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname dispara el recálculo tras navegar
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 16);
        setHidden(y > HIDE_AFTER && y > last.current);
        setTone(toneUnder(header));
        last.current = y;
      });
    };
    update();
    // Además del scroll: cuando la página nueva queda a la vista y cuando termina de cargar.
    const events = ["scroll", "resize", "load", PAGE_REVEALED_EVENT] as const;
    for (const type of events) window.addEventListener(type, update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      for (const type of events) window.removeEventListener(type, update);
    };
  }, [pathname]);

  return (
    <header
      ref={headerRef}
      className={styles.header}
      data-scrolled={scrolled}
      data-hidden={hidden}
      data-tone={tone}
    >
      <div className={`container-site ${styles.bar}`}>
        <TransitionLink href={homeHref} className={styles.home} aria-label={homeLabel}>
          <Logo className={styles.logo} />
        </TransitionLink>

        <nav className={styles.nav} aria-label={navLabel}>
          <ul className={styles.navList}>
            {items.map((item) => (
              <li key={item.href}>
                <TransitionLink
                  href={item.href}
                  className={styles.navLink}
                  aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                >
                  {item.label}
                </TransitionLink>
              </li>
            ))}
          </ul>
          <LanguageSwitch to={language.to} label={language.label} className={styles.lang} />
          <Cta href={cta.href} className={styles.cta}>
            {cta.label}
          </Cta>
        </nav>

        <LanguageSwitch
          to={language.to}
          label={language.label}
          className={`${styles.lang} ${styles.mobileLang}`}
        />
      </div>
    </header>
  );
}
