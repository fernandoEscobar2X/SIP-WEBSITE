import type { TestInfo } from "@playwright/test";

/** Experiencia que corresponde al proyecto (ver `metadata.form` en playwright.config.ts). */
export type Form = "desktop" | "phone" | "tablet";

export function formOf(info: TestInfo): Form {
  const form = info.project.metadata.form;
  if (form === "desktop" || form === "phone" || form === "tablet") return form;
  throw new Error(`El proyecto ${info.project.name} no declara metadata.form`);
}

/** Desktop = navegación en el header, cursor fino y panel de WhatsApp con QR. */
export const isDesktop = (info: TestInfo) => formOf(info) === "desktop";
