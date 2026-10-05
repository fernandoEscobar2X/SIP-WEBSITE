"use client";

import { type ReactNode, useRef, useState } from "react";
import { gsap } from "@/motion/gsap";
import { ease } from "@/motion/tokens";
import { TransitionLink } from "@/motion/transitions/TransitionLink";
import { useSectionMotion } from "@/motion/useSectionMotion";
import { Mark } from "./Mark";
import type { Service } from "./marks";
import styles from "./services.module.css";

export interface ServiceItem {
  readonly id: Service;
  readonly name: string;
  readonly text: string;
  readonly href: string;
}

interface Props {
  readonly items: readonly ServiceItem[];
  readonly header: ReactNode;
  /** Salida a la página de servicios. */
  readonly more: { readonly href: string; readonly text: string };
}

/**
 * Índice de servicios. La lista lleva todo el contenido (nombre, texto y su marca) y cada fila
 * enlaza al detalle; en desktop, la marca grande junto al encabezado sigue a la fila activa
 * (cursor o foco) y se redibuja. En móvil la misma lista se vuelve tarjetas deslizables.
 */
export function ServicesIndexClient({ items, header, more }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Service>(items[0]?.id ?? "dashboards");

  // Las filas llegan como renglones de una placa: el filete se traza y la marca se dibuja.
  useSectionMotion(root, ({ desktop, mobile }) => {
    const scope = root.current;
    if (!scope || !(desktop || mobile)) return undefined;
    const rows = scope.querySelectorAll<HTMLElement>("[data-service-row]");
    gsap.from(rows, {
      opacity: 0,
      y: desktop ? 18 : 0,
      x: desktop ? 0 : 24,
      duration: 0.7,
      stagger: 0.06,
      ease: ease.out.name,
      scrollTrigger: { trigger: scope.querySelector("[data-service-list]"), start: "top 82%" },
    });
    return undefined;
  });

  return (
    <div ref={root} className={styles.layout}>
      <div className={styles.aside}>
        {header}
        <div className={styles.featured} aria-hidden="true">
          {/* La marca se vuelve a montar al cambiar de servicio: así se redibuja. */}
          <Mark key={active} service={active} className={styles.featuredMark} dot={1.3} />
        </div>
        <TransitionLink href={more.href} className={`${styles.more} ${styles.desktopOnly}`}>
          {more.text}
        </TransitionLink>
      </div>
      <ul className={styles.list} data-service-list>
        {items.map((item) => (
          <li key={item.id} className={styles.item} data-service-row>
            <TransitionLink
              href={item.href}
              className={styles.row}
              data-active={item.id === active || undefined}
              onPointerEnter={() => setActive(item.id)}
              onFocus={() => setActive(item.id)}
            >
              <span className={styles.name}>{item.name}</span>
              <span className={styles.text}>{item.text}</span>
              <Mark service={item.id} className={styles.rowMark} />
            </TransitionLink>
          </li>
        ))}
      </ul>
      {/* En móvil la salida va después de las tarjetas. */}
      <TransitionLink href={more.href} className={`${styles.more} ${styles.mobileOnly}`}>
        {more.text}
      </TransitionLink>
    </div>
  );
}
