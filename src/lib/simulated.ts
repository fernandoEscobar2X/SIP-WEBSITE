/**
 * Base de los datos simulados del sitio (lecturas del manifiesto, marcas de servicios, series de
 * industrias). Todo es determinista con semilla: la misma semilla da la misma serie en el
 * servidor, en el navegador y en las pruebas, así el marcado nunca cambia al hidratar.
 */

/** Generador pseudoaleatorio con semilla (mulberry32): números en [0, 1). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Texto que Datatype dibuja como gráfica: `{l:…}` línea, `{b:…}` barras. */
export const datatype = {
  line: (values: readonly number[]) => `{l:${values.join(",")}}`,
  bars: (values: readonly number[]) => `{b:${values.join(",")}}`,
};
