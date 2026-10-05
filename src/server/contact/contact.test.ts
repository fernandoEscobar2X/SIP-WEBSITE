import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { contactSchema } from "../../features/contact/schema";
import type { Query } from "./database";
import { contactEmail, mailConfig, sendEmail } from "./email";
import { ContactOutbox } from "./outbox";
import { parseSubmission, readEvent } from "./submission";

const input = {
  nombre: "Ana Prueba",
  empresa: "Ejemplo",
  correo: "ana@example.com",
  telefono: "",
  industria: "manufactura",
  mensaje: "Queremos conocer sus servicios.\nGracias.",
} as const;
const config = { from: "formularios@mail.sipintegrales.com", apiKey: "test-only" };
const event = (data: unknown = input) => ({
  payload: { id: "submission-00001", form_name: "contacto", data },
});

describe("validación y plantilla de correo", () => {
  it("valida en servidor y descarta spam, datos manipulados y campos faltantes", () => {
    expect(parseSubmission(event())).toEqual({ id: "submission-00001", data: input });
    for (const data of [
      { ...input, "sitio-web": "https://example.com" },
      { ...input, nombre: "Ana\r\nBcc: otro@example.com" },
      { ...input, correo: "ana@example.com\r\nBcc: otro@example.com" },
      { ...input, mensaje: "hola" },
      { ...input, industria: "inexistente" },
      { ...input, telefono: "123\n4567" },
      { ...input, nombre: 123 },
    ])
      expect(parseSubmission(event(data))).toBeNull();
    expect(parseSubmission({ payload: { ...event().payload, form_name: "otro" } })).toBeNull();
    expect(parseSubmission({ payload: { ...event().payload, spam: true } })).toBeNull();
    expect(parseSubmission({ payload: { ...event().payload, id: "../../private" } })).toBeNull();
    expect(parseSubmission(event({}))).toBeNull();
  });

  it("limita el cuerpo del evento y rechaza JSON inválido", async () => {
    const request = (body: string) => new Request("https://example.com", { method: "POST", body });
    expect(await readEvent(request(JSON.stringify(event())))).toEqual(event());
    expect(await readEvent(request("x".repeat(32_769)))).toBeNull();
    expect(await readEvent(request("{broken"))).toBeNull();
  });

  it("escapa contenido HTML y fija destinatario, asunto, Reply-To y folio", () => {
    const data = contactSchema.parse({
      ...input,
      nombre: '<img src="x">',
      mensaje: '<script>alert("x")</script>\nNueva línea.',
    });
    const email = contactEmail(data, "12", new Date("2026-10-05T17:00:00Z"), config.from);
    expect(email.to).toEqual(["humberto@sipintegrales.com"]);
    expect(email.reply_to).toBe(input.correo);
    expect(email.subject).toBe("[SIP-000012] Nueva solicitud del sitio SIP");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain('<img src="x">');
    expect(email.html).toContain("<br>Nueva línea.");
    expect(email.html).toContain("Tijuana");
    expect(email.text).toContain("SIP-000012");
  });

  it("integra la marca PNG en el correo y conserva el dominio y los datos legibles", () => {
    const email = contactEmail(input, "3", new Date("2026-10-05T17:00:00Z"), config.from);
    const logo = email.attachments?.[0];
    expect(logo).toMatchObject({
      filename: "sip-logo.png",
      content_type: "image/png",
      content_id: "sip-logo",
    });
    const png = Buffer.from(logo?.content ?? "", "base64");
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(380);
    expect(png.length).toBeLessThan(12_000);
    expect(email.html).toContain('src="cid:sip-logo"');
    expect(email.html).toContain('href="https://sipintegrales.com"');
    expect(email.html).not.toContain("netlify.app");
    expect(email.html).toContain("Hola, Humberto.");
    expect(email.html).toContain("Ana Prueba, de Ejemplo,");
    expect(email.html).toContain("Manufactura");
    expect(email.text).toContain("https://sipintegrales.com");
    expect(email.text).toContain("Puedes responder a este correo");
  });

  it("exige un remitente del dominio de SIP y una clave privada", () => {
    expect(() => mailConfig({})).toThrow("SIP_MAIL_CONFIG_MISSING");
    expect(() => mailConfig({ RESEND_API_KEY: "test", CONTACT_MAIL_FROM: "otro@example.com" })).toThrow();
    expect(mailConfig({ RESEND_API_KEY: "test", CONTACT_MAIL_FROM: config.from })).toEqual({
      apiKey: "test",
      from: config.from,
    });
  });

  it("envía HTML y alternativa texto a la API con clave de idempotencia", async () => {
    const email = contactEmail(input, "1", new Date(), config.from);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: "provider-1" })));
    expect(await sendEmail(email, "sip-contact/submission-00001", "test", fetcher)).toBe("provider-1");
    const options = fetcher.mock.calls[0]?.[1];
    expect(options?.headers).toMatchObject({ "Idempotency-Key": "sip-contact/submission-00001" });
    expect(JSON.parse(String(options?.body))).toEqual(email);
    expect(options?.redirect).toBe("error");
    fetcher.mockResolvedValue(new Response("error secreto", { status: 429 }));
    await expect(sendEmail(email, "same-key", "test", fetcher)).rejects.toThrow("SIP_MAIL_PROVIDER_429");
  });
});

describe("folios y bandeja persistente en PostgreSQL", () => {
  let query: Query;
  let close: () => Promise<void>;
  let outbox: ContactOutbox;
  beforeAll(async () => {
    const testUrl = process.env.SIP_MAIL_TEST_DATABASE_URL;
    if (testUrl) {
      const parsed = new URL(testUrl);
      if (
        !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
        !/^\/sip_mail_test[a-z0-9_]*$/.test(parsed.pathname)
      ) {
        throw new Error("Las pruebas solo admiten una base sip_mail_test en loopback.");
      }
      const pool = new Pool({ connectionString: testUrl, max: 12 });
      query = (sql, values) => pool.query(sql, values);
      close = () => pool.end();
    } else {
      const db = new PGlite(); // Motor PostgreSQL real en WASM; sin simular consultas.
      query = (sql, values) => db.query<Record<string, unknown>>(sql, values);
      close = () => db.close();
    }
    const migration = await readFile(
      new URL("../../../migrations/001-contact-mail.sql", import.meta.url),
      "utf8",
    );
    // Los drivers PostgreSQL y PGlite admiten las sentencias del esquema por separado.
    for (const statement of migration
      .replace(/^--.*$/gm, "")
      .split(";")
      .filter((part) => part.trim()))
      await query(statement);
  }, 30_000);
  beforeEach(async () => {
    await query("TRUNCATE sip_contact_notifications RESTART IDENTITY");
    outbox = new ContactOutbox(query);
  });
  afterAll(async () => {
    await close?.();
  });

  it("asigna números únicos para envíos simultáneos y conserva el folio de cada replay", async () => {
    const numbers = await Promise.all(
      Array.from({ length: 30 }, (_, i) => outbox.register(`submission-${i}`, input)),
    );
    expect(new Set(numbers).size).toBe(30);
    const same = await Promise.all(
      Array.from({ length: 12 }, () => outbox.register("submission-0", { ...input, nombre: "Reemplazo" })),
    );
    expect(new Set(same)).toEqual(new Set([numbers[0]]));
    const row = await query("SELECT data FROM sip_contact_notifications WHERE number = $1", [numbers[0]]);
    expect(row.rows[0]?.data).toEqual(input);
  });

  it("solo un trabajador envía el mismo folio y borra la copia de datos al aceptarlo el proveedor", async () => {
    const number = await outbox.register("submission-00001", input);
    const sender = vi.fn(async () => "provider-1");
    await Promise.all(Array.from({ length: 15 }, () => outbox.deliver(number, config, sender)));
    expect(sender).toHaveBeenCalledTimes(1);
    const row = (await query("SELECT status, data, email, provider_id FROM sip_contact_notifications"))
      .rows[0];
    expect(row).toMatchObject({ status: "sent", data: null, email: null, provider_id: "provider-1" });
    await outbox.deliver(number, config, sender);
    expect(sender).toHaveBeenCalledTimes(1);
  });

  it("recupera fallos con el mismo contenido y clave aunque cambien remitente o plantilla", async () => {
    const number = await outbox.register("submission-00001", input);
    const sender = vi.fn(async () => "provider-1").mockRejectedValueOnce(new Error("network secret"));
    expect(await outbox.deliver(number, config, sender)).toBe("pending");
    await query("UPDATE sip_contact_notifications SET next_attempt_at = now()");
    await outbox.retry({ ...config, from: "otro@sipintegrales.com" }, sender);
    expect(sender).toHaveBeenCalledTimes(2);
    expect(sender.mock.calls[0]).toEqual(sender.mock.calls[1]);
    const row = (await query("SELECT status, attempts, last_error FROM sip_contact_notifications")).rows[0];
    expect(row).toMatchObject({ status: "sent", attempts: 2, last_error: null });
  });

  it("recupera una ejecución interrumpida y exige revisión tras la ventana segura de reintentos", async () => {
    const number = await outbox.register("submission-00001", input);
    await query(
      "UPDATE sip_contact_notifications SET status = 'sending', lease_until = now() - interval '1 minute'",
    );
    const sender = vi.fn(async () => "provider-1");
    expect(await outbox.deliver(number, config, sender)).toBe("sent");
    const old = await outbox.register("submission-00002", input);
    await query(
      "UPDATE sip_contact_notifications SET first_attempt_at = now() - interval '21 hours' WHERE number = $1",
      [old],
    );
    expect(await outbox.deliver(old, config, sender)).toBe("skipped");
    expect(sender).toHaveBeenCalledTimes(1);
    expect(
      (await query("SELECT status FROM sip_contact_notifications WHERE number = $1", [old])).rows[0]?.status,
    ).toBe("review");
  });

  it("limita la recuperación por ejecución y conserva el orden de los folios pendientes", async () => {
    const first = await outbox.register("submission-00001", input);
    await outbox.register("submission-00002", input);
    const sender = vi.fn(async () => "provider-1");
    await outbox.retry(config, sender);
    expect(sender).toHaveBeenCalledTimes(1);
    const rows = (await query("SELECT number::text, status FROM sip_contact_notifications ORDER BY number"))
      .rows;
    expect(rows).toEqual([
      { number: first, status: "sent" },
      { number: "2", status: "pending" },
    ]);
  });
});
