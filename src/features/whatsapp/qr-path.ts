/**
 * Convierte la matriz de un QR en un único `d` de SVG: une módulos oscuros
 * contiguos de cada fila en un rectángulo (path corto, render nítido).
 */
export function qrMatrixToPath(matrix: readonly (readonly boolean[])[]): string {
  let d = "";
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x++;
      d += `M${start} ${y}h${x - start}v1h-${x - start}z`;
    }
  });
  return d;
}

/** Operación inversa (para pruebas): reconstruye la matriz desde el path. */
export function qrPathToMatrix(d: string, size: number): boolean[][] {
  const matrix = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  for (const [, xs, ys, ws] of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    const x = Number(xs);
    const y = Number(ys);
    const row = matrix[y];
    if (!row) continue;
    for (let i = 0; i < Number(ws); i++) row[x + i] = true;
  }
  return matrix;
}
