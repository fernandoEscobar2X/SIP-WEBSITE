import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of leaves(value, path)) out.set(k, v);
  }
  return out;
}

describe("mensajes es/en", () => {
  const esLeaves = leaves(es);
  const enLeaves = leaves(en);

  it("tienen exactamente las mismas claves", () => {
    expect([...enLeaves.keys()].sort()).toEqual([...esLeaves.keys()].sort());
  });

  it("no tienen textos vacíos", () => {
    for (const [key, value] of [...esLeaves, ...enLeaves]) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("las meta descripciones caben en el resultado de búsqueda (≤ 160)", () => {
    for (const [key, value] of [...esLeaves, ...enLeaves]) {
      if (key.endsWith(".description")) expect(value.length, key).toBeLessThanOrEqual(160);
    }
  });
});
