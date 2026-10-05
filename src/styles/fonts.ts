import localFont from "next/font/local";

/**
 * Fuentes locales (OFL, ver src/fonts/licenses). next/font genera @font-face,
 * precarga y un fallback con métricas ajustadas para evitar saltos de layout.
 * Solo display y texto se precargan; Datatype se descarga al usarse.
 */
export const hubot = localFont({
  src: "../fonts/hubot-sans-latin-wdth.woff2",
  variable: "--font-hubot",
  weight: "200 900",
  display: "swap",
  adjustFontFallback: "Arial",
  declarations: [{ prop: "font-stretch", value: "75% 125%" }],
});

export const mona = localFont({
  src: "../fonts/mona-sans-latin-wght.woff2",
  variable: "--font-mona",
  weight: "200 900",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const datatype = localFont({
  src: "../fonts/datatype-latin-wght.woff2",
  variable: "--font-datatype",
  weight: "100 900",
  // "block": con la fuente de respaldo se leería la sintaxis cruda ({l:40,52,…}), no una gráfica.
  display: "block",
  preload: false,
  adjustFontFallback: false,
});

export const fontVariables = [hubot, mona, datatype].map((f) => f.variable).join(" ");
