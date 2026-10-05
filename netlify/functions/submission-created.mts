import type { Context } from "@netlify/functions";
import { withDatabase } from "../../src/server/contact/database";
import { mailConfig } from "../../src/server/contact/email";
import { ContactOutbox } from "../../src/server/contact/outbox";
import { parseSubmission, readEvent } from "../../src/server/contact/submission";

/** Evento reservado de Netlify Forms; Netlify valida la firma JWS antes de invocar esta función. */
export default async (request: Request, context: Context) => {
  if (context.deploy.context !== "production") return new Response(null, { status: 204 });
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const submission = parseSubmission(await readEvent(request));
  if (!submission) return new Response(null, { status: 204 });
  try {
    // Se guarda primero incluso si falta la clave de Resend; la tarea programada puede recuperarlo.
    await withDatabase(async (query) => {
      const outbox = new ContactOutbox(query);
      const number = await outbox.register(submission.id, submission.data);
      await outbox.deliver(number, mailConfig());
    });
    return new Response(null, { status: 204 });
  } catch {
    console.error("SIP_MAIL_PROCESSING_FAILED");
    return new Response(null, { status: 503 });
  }
};
