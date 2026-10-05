import type { ReactNode } from "react";
import { TransitionLink } from "@/motion/transitions/TransitionLink";
import styles from "./cta.module.css";

interface CtaProps {
  readonly href: string;
  readonly children: ReactNode;
  readonly size?: "regular" | "large";
  readonly className?: string;
}

/** Llamado a la acción principal (un solo estilo en todo el sitio). */
export function Cta({ href, children, size = "regular", className }: CtaProps) {
  const classes = [styles.cta, size === "large" ? styles.large : undefined, className]
    .filter(Boolean)
    .join(" ");
  return (
    <TransitionLink href={href} className={classes}>
      {children}
    </TransitionLink>
  );
}
