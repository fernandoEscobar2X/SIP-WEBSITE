import { z } from "zod";
import {
  CONTACT_FORM_NAME,
  contactFields,
  contactSchema,
  HONEYPOT_FIELD,
} from "../../features/contact/schema";

const envelope = z.object({
  payload: z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{8,128}$/),
    form_name: z.string(),
    data: z.record(z.string(), z.unknown()),
    spam: z.boolean().optional(),
  }),
});

export function parseSubmission(value: unknown) {
  const event = envelope.safeParse(value);
  if (!event.success) return null;
  const { payload } = event.data;
  if (payload.form_name !== CONTACT_FORM_NAME || payload.spam || payload.data[HONEYPOT_FIELD]) return null;
  const data = contactSchema.safeParse(
    Object.fromEntries(contactFields.map((field) => [field, payload.data[field] ?? ""])),
  );
  return data.success ? { id: payload.id, data: data.data } : null;
}

/** Limita bytes incluso si Content-Length no existe o es incorrecto. */
export async function readEvent(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32_768) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
