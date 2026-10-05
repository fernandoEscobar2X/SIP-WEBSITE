/**
 * Tokens de movimiento para JS (GSAP y WebGL).
 * Deben coincidir con --ease-* y --duration-* de src/styles/tokens.css;
 * un test lo verifica para que CSS y JS no se desincronicen.
 */
export const ease = {
  /** Salida firme, sin rebote: la sensación de una máquina que llega a su posición. */
  out: { name: "sip.out", bezier: [0.16, 0.84, 0.3, 1] },
  in: { name: "sip.in", bezier: [0.7, 0, 0.84, 0] },
  inOut: { name: "sip.inOut", bezier: [0.65, 0, 0.35, 1] },
} as const;

/** Duraciones en segundos (GSAP). */
export const duration = {
  fast: 0.18,
  base: 0.42,
  slow: 0.9,
} as const;

/** Ángulo de la I del logo, en grados. */
export const angleCorte = 6;

/** Desplazamiento horizontal del corte por cada unidad de altura (tan 6°). */
export const tanCorte = Math.tan((angleCorte * Math.PI) / 180);

export const breakpoints = {
  /** Desktop = pantallas con puntero fino y ancho ≥ 64rem. */
  desktop: "(min-width: 64rem)",
  mobile: "(max-width: 63.99rem)",
  reducedMotion: "(prefers-reduced-motion: reduce)",
  finePointer: "(hover: hover) and (pointer: fine)",
} as const;
