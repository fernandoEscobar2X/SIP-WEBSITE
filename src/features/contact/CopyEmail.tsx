"use client";

import { useEffect, useState } from "react";
import styles from "./contact.module.css";

interface CopyEmailProps {
  readonly email: string;
  readonly copy: string;
  readonly copied: string;
}

/** Copia el correo al portapapeles y lo confirma en una región viva (sin íconos). */
export function CopyEmail({ email, copy, copied }: CopyEmailProps) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const timeout = window.setTimeout(() => setDone(false), 2400);
    return () => window.clearTimeout(timeout);
  }, [done]);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setDone(true);
    } catch {
      // Sin permiso de portapapeles: el enlace mailto sigue disponible al lado.
    }
  };

  return (
    <button type="button" className={styles.copy} onClick={onClick}>
      <span aria-live="polite">{done ? copied : copy}</span>
    </button>
  );
}
