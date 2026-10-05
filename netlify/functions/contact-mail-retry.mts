import type { Config, Context } from "@netlify/functions";
import { withDatabase } from "../../src/server/contact/database";
import { mailConfig } from "../../src/server/contact/email";
import { ContactOutbox } from "../../src/server/contact/outbox";

// Netlify invoca las funciones programadas internamente; no son un endpoint público de envío.
export default async (_request: Request, context: Context) => {
  if (context.deploy.context !== "production") return;
  try {
    const config = mailConfig();
    await withDatabase((query) => new ContactOutbox(query).retry(config));
  } catch {
    console.error("SIP_MAIL_RETRY_FAILED");
    throw new Error("SIP_MAIL_RETRY_FAILED");
  }
};

export const config: Config = { schedule: "*/15 * * * *" };
