import { z } from "zod";
import type { ContactInput } from "../../features/contact/schema";
import { site } from "../../lib/site";

export interface MailConfig {
  readonly apiKey: string;
  readonly from: string;
}

export interface ContactEmail {
  readonly from: string;
  readonly to: readonly string[];
  readonly reply_to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export function mailConfig(env: Readonly<Record<string, string | undefined>> = process.env): MailConfig {
  const from = z.email().safeParse(env.CONTACT_MAIL_FROM);
  if (!env.RESEND_API_KEY || !from.success || !/@(?:[a-z0-9-]+\.)*sipintegrales\.com$/i.test(from.data)) {
    throw new Error("SIP_MAIL_CONFIG_MISSING");
  }
  return { apiKey: env.RESEND_API_KEY, from: from.data };
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );

export function contactEmail(
  data: ContactInput,
  number: string,
  receivedAt: Date,
  from: string,
): ContactEmail {
  if (!/^[1-9]\d*$/.test(number)) throw new Error("SIP_MAIL_INVALID_NUMBER");
  const folio = `SIP-${number.padStart(6, "0")}`;
  const date = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: site.timeZone,
  }).format(receivedAt);
  const fields = [
    ["Nombre", data.nombre],
    ["Empresa", data.empresa || "Sin especificar"],
    ["Correo", data.correo],
    ["Teléfono", data.telefono || "Sin especificar"],
    ["Industria", data.industria || "Sin especificar"],
  ];
  const rows = fields
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:12px 16px;border-bottom:1px solid #dce5ec;color:#496173;font-weight:400;width:100px">${escapeHtml(label ?? "")}</th><td style="padding:12px 16px;border-bottom:1px solid #dce5ec">${escapeHtml(value ?? "")}</td></tr>`,
    )
    .join("");
  return {
    from: `SIP · Formulario web <${from}>`,
    to: [site.email],
    reply_to: data.correo,
    subject: `[${folio}] Nueva solicitud del sitio SIP`,
    html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eef3f7;color:#152c3d;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden"><tr><td style="background:#08283e;color:#ffffff;padding:28px"><p style="margin:0 0 16px;letter-spacing:3px;font-size:14px">SIP</p><h1 style="margin:0 0 12px;font-size:26px">Nueva solicitud de contacto</h1><p style="margin:0;font-size:18px">${folio}</p><p style="margin:8px 0 0;color:#bed1df;font-size:13px">${escapeHtml(date)} · Tijuana</p></td></tr><tr><td style="padding:20px 12px"><table width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr><tr><td style="padding:4px 28px 28px"><h2 style="font-size:16px">Mensaje</h2><p style="margin:0;line-height:1.7;overflow-wrap:anywhere">${escapeHtml(data.mensaje).replace(/\r?\n/g, "<br>")}</p></td></tr><tr><td style="padding:20px 28px;background:#e9f1f6;font-size:13px;line-height:1.6">Responde a este correo para contactar a la persona que escribió.<br>Sistemas Inteligentes del Pacífico · ${site.email}</td></tr></table></td></tr></table></body></html>`,
    text: `${folio}\nNueva solicitud de contacto\n${date} · Tijuana\n\n${fields.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nMensaje:\n${data.mensaje}\n\nSIP · ${site.email}`,
  };
}

/** Resend deduplica la misma clave y contenido durante 24 horas. No se registran datos ni secretos. */
export async function sendEmail(
  email: ContactEmail,
  key: string,
  apiKey: string,
  fetcher = fetch,
): Promise<string> {
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify(email),
    signal: AbortSignal.timeout(8_000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`SIP_MAIL_PROVIDER_${response.status}`);
  const result = z.object({ id: z.string().min(1).max(128) }).safeParse(await response.json());
  if (!result.success) throw new Error("SIP_MAIL_PROVIDER_RESPONSE_INVALID");
  return result.data.id;
}
