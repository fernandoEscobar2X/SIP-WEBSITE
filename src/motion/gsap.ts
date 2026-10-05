import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { duration, ease } from "./tokens";

/**
 * Registro único de GSAP. Solo núcleo + ScrollTrigger + CustomEase; los plugins
 * pesados (SplitText, Flip, DrawSVG) se importan bajo demanda en cada pieza.
 */
let registered = false;

function register(): void {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, CustomEase, useGSAP);
  for (const e of Object.values(ease)) {
    CustomEase.create(e.name, e.bezier.join(","));
  }
  gsap.defaults({ ease: ease.out.name, duration: duration.base });
  registered = true;
}

register();

export { gsap, ScrollTrigger, useGSAP };
