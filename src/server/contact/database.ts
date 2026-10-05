import { Client } from "pg";

export type Query = (sql: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

export async function withDatabase<T>(run: (query: Query) => Promise<T>): Promise<T> {
  const raw = process.env.CONTACT_DATABASE_URL;
  if (!raw) throw new Error("SIP_MAIL_DATABASE_MISSING");
  const url = new URL(raw);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("SIP_MAIL_DATABASE_INVALID");
  // Un sslmode en el URL puede sustituir las opciones TLS de pg. Se impone validación del certificado.
  url.search = "";
  const client = new Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
    enableChannelBinding: true,
    connectionTimeoutMillis: 8_000,
    statement_timeout: 8_000,
    query_timeout: 10_000,
    application_name: "sip-contact-mail",
  });
  try {
    await client.connect();
    return await run((sql, values) => client.query(sql, values));
  } finally {
    await client.end();
  }
}
