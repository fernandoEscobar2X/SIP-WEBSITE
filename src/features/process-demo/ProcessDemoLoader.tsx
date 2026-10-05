"use client";

import { type ComponentType, type ReactNode, useEffect, useRef, useState } from "react";
import type { ProcessText } from "./app";

type DemoComponent = ComponentType<{ text: ProcessText; locale: string }>;

/**
 * Carga la microdemo cuando la sección se acerca a la pantalla. Mientras tanto (y sin JavaScript)
 * se ve el póster que entrega el servidor: la misma instalación, sin interacción. Así el código
 * de la demo nunca compite con la carga inicial de la página.
 */
export function ProcessDemoLoader({
  text,
  locale,
  children,
}: {
  text: ProcessText;
  locale: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [Demo, setDemo] = useState<DemoComponent | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        void import("./ProcessDemoClient").then((module) => {
          if (!cancelled) setDemo(() => module.ProcessDemoClient);
        });
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return <div ref={ref}>{Demo ? <Demo text={text} locale={locale} /> : children}</div>;
}
