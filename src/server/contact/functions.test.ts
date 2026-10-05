import type { Context } from "@netlify/functions";
import { afterEach, describe, expect, it, vi } from "vitest";
import retry from "../../../netlify/functions/contact-mail-retry.mts";
import submission from "../../../netlify/functions/submission-created.mts";
import { withDatabase } from "./database";

vi.mock("./database", () => ({ withDatabase: vi.fn().mockRejectedValue(new Error("private failure")) }));
const context = (name: string) => ({ deploy: { context: name } }) as Context;
const request = () =>
  new Request("https://example.com", {
    method: "POST",
    body: JSON.stringify({
      payload: {
        id: "submission-00001",
        form_name: "contacto",
        data: {
          nombre: "Ana Prueba",
          correo: "ana@example.com",
          mensaje: "Consulta de prueba.",
        },
      },
    }),
  });

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("funciones de Netlify", () => {
  it("usa el contexto real de runtime, sin depender de CONTEXT del build", async () => {
    vi.stubEnv("CONTEXT", undefined);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await submission(request(), context("production"))).status).toBe(503);
    expect(withDatabase).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("SIP_MAIL_PROCESSING_FAILED");
  });
  it("un deploy preview no registra ni envía mensajes aunque CONTEXT diga production", async () => {
    vi.stubEnv("CONTEXT", "production");
    expect((await submission(request(), context("deploy-preview"))).status).toBe(204);
    await retry(request(), context("deploy-preview"));
    expect(withDatabase).not.toHaveBeenCalled();
  });
});
