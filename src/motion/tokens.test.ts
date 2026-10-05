import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { angleCorte, duration, ease } from "./tokens";

const css = readFileSync(resolve(__dirname, "../styles/tokens.css"), "utf8");

function cssToken(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match?.[1]) throw new Error(`Token --${name} no encontrado en tokens.css`);
  return match[1].trim();
}

describe("tokens de movimiento CSS ↔ JS", () => {
  it("los easings coinciden", () => {
    const pairs = { out: "ease-sip-out", in: "ease-sip-in", inOut: "ease-sip-in-out" } as const;
    for (const [key, token] of Object.entries(pairs) as [keyof typeof pairs, string][]) {
      expect(cssToken(token)).toBe(`cubic-bezier(${ease[key].bezier.join(", ")})`);
    }
  });

  it("las duraciones coinciden", () => {
    expect(cssToken("duration-fast")).toBe(`${duration.fast * 1000}ms`);
    expect(cssToken("duration-base")).toBe(`${duration.base * 1000}ms`);
    expect(cssToken("duration-slow")).toBe(`${duration.slow * 1000}ms`);
  });

  it("el ángulo del corte coincide", () => {
    expect(cssToken("angle-corte")).toBe(`${angleCorte}deg`);
  });
});
