import { randomUUID } from "node:crypto";
import type { ContactInput } from "../../features/contact/schema";
import type { Query } from "./database";
import { type ContactEmail, contactEmail, type MailConfig, sendEmail } from "./email";

interface Notice {
  readonly number: string;
  readonly submission_id: string;
  readonly created_at: Date;
  readonly data: ContactInput | null;
  readonly email: ContactEmail | null;
  readonly status: string;
}

export class ContactOutbox {
  constructor(private readonly query: Query) {}

  async register(id: string, data: ContactInput): Promise<string> {
    // El identificador de Netlify es único; el replay conserva el folio y el contenido original.
    await this.query(
      `INSERT INTO sip_contact_notifications (submission_id, data)
      VALUES ($1, $2::jsonb) ON CONFLICT (submission_id) DO NOTHING`,
      [id, JSON.stringify(data)],
    );
    const result = await this.query(
      "SELECT number::text FROM sip_contact_notifications WHERE submission_id = $1",
      [id],
    );
    const number = result.rows[0]?.number;
    if (typeof number !== "string") throw new Error("SIP_MAIL_REGISTER_FAILED");
    return number;
  }

  async deliver(
    number: string,
    config: MailConfig,
    sender = sendEmail,
  ): Promise<"sent" | "skipped" | "pending"> {
    const token = randomUUID();
    // Fuera de la ventana de idempotencia se exige revisión humana; no se duplica a ciegas.
    await this.query(
      `UPDATE sip_contact_notifications SET status = 'review', lease_token = NULL, lease_until = NULL
      WHERE number = $1 AND status IN ('pending', 'sending')
        AND first_attempt_at < now() - interval '20 hours'
        AND (lease_until IS NULL OR lease_until < now())`,
      [number],
    );
    const claim = await this.query(
      `UPDATE sip_contact_notifications
      SET status = 'sending', lease_token = $2, lease_until = now() + interval '2 minutes',
          first_attempt_at = coalesce(first_attempt_at, now()), attempts = attempts + 1
      WHERE number = $1 AND status IN ('pending', 'sending')
        AND next_attempt_at <= now() AND (lease_until IS NULL OR lease_until < now())
      RETURNING number::text, submission_id, created_at, data, email, status`,
      [number, token],
    );
    const row = claim.rows[0] as unknown as Notice | undefined;
    if (!row) return "skipped";
    try {
      if (!row.data && !row.email) throw new Error("SIP_MAIL_PAYLOAD_MISSING");
      const email =
        row.email ??
        contactEmail(row.data as ContactInput, row.number, new Date(row.created_at), config.from);
      // Se congela antes del primer envío: un deploy no cambia el contenido de un reintento.
      await this.query(
        "UPDATE sip_contact_notifications SET email = $3::jsonb WHERE number = $1 AND lease_token = $2",
        [number, token, JSON.stringify(email)],
      );
      const providerId = await sender(email, `sip-contact/${row.submission_id}`, config.apiKey);
      await this.query(
        `UPDATE sip_contact_notifications SET status = 'sent', provider_id = $3,
        sent_at = now(), data = NULL, email = NULL, lease_token = NULL, lease_until = NULL, last_error = NULL
        WHERE number = $1 AND lease_token = $2`,
        [number, token, providerId],
      );
      return "sent";
    } catch {
      await this.query(
        `UPDATE sip_contact_notifications SET status = 'pending', next_attempt_at = now() + interval '15 minutes',
        lease_token = NULL, lease_until = NULL, last_error = 'delivery_failed'
        WHERE number = $1 AND lease_token = $2`,
        [number, token],
      );
      return "pending";
    }
  }

  async retry(config: MailConfig, sender = sendEmail): Promise<void> {
    // Una entrega por ejecución: las funciones programadas tienen un límite de 30 segundos.
    const due = await this.query(`SELECT number::text FROM sip_contact_notifications
      WHERE status IN ('pending', 'sending') AND next_attempt_at <= now()
        AND (lease_until IS NULL OR lease_until < now()) ORDER BY number LIMIT 1`);
    for (const row of due.rows) await this.deliver(String(row.number), config, sender);
    // Los mensajes en revisión se conservan en Netlify Forms. La copia temporal expira a los 30 días.
    await this.query(`UPDATE sip_contact_notifications SET data = NULL, email = NULL
      WHERE status = 'review' AND created_at < now() - interval '30 days'`);
    const review = await this.query(
      "SELECT count(*)::text AS count FROM sip_contact_notifications WHERE status = 'review'",
    );
    if (review.rows[0]?.count !== "0") console.warn("SIP_MAIL_REVIEW_REQUIRED");
  }
}
