import { z } from "zod";
import type { ContactInput } from "../../features/contact/schema";
import { site } from "../../lib/site";
import { mailLogo } from "./logo.generated";

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
  /** Opcional para conservar los reintentos de correos generados antes de integrar el logo. */
  readonly attachments?: readonly {
    readonly filename: string;
    readonly content: string;
    readonly content_type: string;
    readonly content_id: string;
  }[];
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
    ["Industria", industryLabel(data.industria)],
  ];
  const rows = fields
    .map(
      ([label, value]) =>
        `<tr><th scope="row" align="left" valign="top" style="padding:12px 0;border-bottom:1px solid #e4eaf0;color:#5a6b80;font-size:13px;font-weight:400;width:84px">${escapeHtml(label ?? "")}</th><td valign="top" style="padding:12px 0 12px 12px;border-bottom:1px solid #e4eaf0;color:#1d2c41;font-size:15px;line-height:1.5;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(value ?? "")}</td></tr>`,
    )
    .join("");
  const website = `https://${site.domain}`;
  const introduction = `${data.nombre}${data.empresa ? `, de ${data.empresa},` : ""} te escribió desde ${site.domain}.`;
  const reply = "Puedes responder a este correo para continuar la conversación.";
  return {
    from: `SIP · Contacto <${from}>`,
    to: [site.email],
    reply_to: data.correo,
    subject: `[${folio}] Nueva solicitud del sitio SIP`,
    html: `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${folio} · Contacto SIP</title>
<style>body,table,td{margin:0}table{border-collapse:collapse}a{color:#145998} @media screen and (max-width:480px){.content{padding-left:24px!important;padding-right:24px!important}.greeting{font-size:28px!important}}</style></head>
<body style="margin:0;padding:0;background-color:#edf2f7;color:#1d2c41;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeHtml(data.nombre)} escribió a SIP. Solicitud ${folio}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#edf2f7"><tr><td align="center" style="padding:32px 12px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e0e7ef">
<tr><td height="4" style="height:4px;background-color:#0189f5;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="content" style="padding:32px 40px 26px"><a href="${website}" style="text-decoration:none"><img src="cid:${mailLogo.contentId}" width="190" height="91" alt="SIP — Sistemas Inteligentes del Pacífico" style="display:block;width:190px;max-width:100%;height:auto;border:0;color:#1d2c41;font-size:14px"></a></td></tr>
<tr><td class="content" style="padding:0 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:16px 0;border-top:1px solid #e4eaf0;border-bottom:1px solid #e4eaf0;font-size:11px;font-weight:700;letter-spacing:1px;color:#5a6b80">CONTACTO WEB</td><td align="right" style="padding:16px 0;border-top:1px solid #e4eaf0;border-bottom:1px solid #e4eaf0;font-family:Consolas,Menlo,monospace;font-size:13px;font-weight:700;color:#145998">${folio}</td></tr></table></td></tr>
<tr><td class="content" style="padding:30px 40px 24px"><h1 class="greeting" style="margin:0 0 12px;font-size:32px;font-weight:700;letter-spacing:-1px;line-height:1.2;color:#1d2c41">Hola, Humberto.</h1><p style="margin:0;font-size:16px;line-height:1.7;color:#52647b;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(introduction)}</p></td></tr>
<tr><td class="content" style="padding:0 40px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f8fd;border-left:3px solid #0189f5;table-layout:fixed"><tr><td style="padding:22px 24px"><p style="margin:0 0 12px;color:#145998;font-size:11px;font-weight:700;letter-spacing:1px">SU MENSAJE</p><p style="margin:0;color:#1d2c41;font-size:16px;line-height:1.75;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(data.mensaje).replace(/\r?\n/g, "<br>")}</p></td></tr></table></td></tr>
<tr><td class="content" style="padding:0 40px 28px"><h2 style="margin:0 0 6px;font-size:16px;font-weight:700;color:#1d2c41">Datos para seguir en contacto</h2><table width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed">${rows}</table><p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#5a6b80">Recibido el ${escapeHtml(date)} · horario de Tijuana.</p></td></tr>
<tr><td class="content" style="padding:24px 40px;background-color:#1d2c41"><p style="margin:0;color:#ffffff;font-size:15px;line-height:1.6;font-weight:700">La conversación empieza aquí.</p><p style="margin:6px 0 0;color:#d8e5f2;font-size:13px;line-height:1.6">${reply}</p></td></tr>
<tr><td class="content" style="padding:24px 40px"><p style="margin:0 0 5px;font-size:12px;line-height:1.6;color:#52647b">${site.name}<br>Tijuana, Baja California</p><a href="${website}" style="color:#145998;font-size:13px;line-height:1.6;text-decoration:underline">${site.domain}</a><p style="margin:12px 0 0;font-size:11px;line-height:1.6;color:#5a6b80">Notificación del formulario de contacto para ${site.email}.</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`,
    text: `${folio}\n\nHola, Humberto.\n${introduction}\n\n${data.mensaje}\n\nDatos para seguir en contacto\n${fields.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nRecibido el ${date} · horario de Tijuana.\n${reply}\n\n${site.name}\n${website}\n${site.email}`,
    attachments: [
      {
        filename: "sip-logo.png",
        content: mailLogo.content,
        content_type: "image/png",
        content_id: mailLogo.contentId,
      },
    ],
  };
}

function industryLabel(value: ContactInput["industria"]): string {
  const labels: Record<Exclude<ContactInput["industria"], "">, string> = {
    manufactura: "Manufactura",
    logistica: "Logística",
    construccion: "Construcción",
    energia: "Energía",
    agroindustria: "Agroindustria",
    otra: "Otra",
  };
  return value ? labels[value] : "Sin especificar";
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
