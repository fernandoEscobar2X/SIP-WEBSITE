/** Configuración y migración locales; no envía correos ni imprime credenciales. */
import { readFile } from "node:fs/promises";
import { Client } from "pg";

const migrate = process.argv.includes("--migrate");
const raw = migrate ? process.env.CONTACT_DATABASE_ADMIN_URL : process.env.CONTACT_DATABASE_URL;
const expected = process.env.CONTACT_DATABASE_NAME;
if (!raw || !expected)
  throw new Error("Configura la conexión privada y CONTACT_DATABASE_NAME en .env.local.");
const url = new URL(raw);
url.search = "";
const client = new Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
  connectionTimeoutMillis: 8_000,
  statement_timeout: 10_000,
});
try {
  await client.connect();
  const { rows } = await client.query("SELECT current_database() AS database, current_user AS role");
  if (rows[0].database !== expected)
    throw new Error("La base conectada no coincide con CONTACT_DATABASE_NAME. Operación cancelada.");
  console.log(`Base verificada: ${rows[0].database}; rol: ${rows[0].role}; host: ${url.hostname}`);
  if (migrate) {
    const role = process.env.CONTACT_DATABASE_ROLE;
    if (!role || !/^[a-z_][a-z0-9_]{0,62}$/.test(role) || role === rows[0].role)
      throw new Error(
        "Configura CONTACT_DATABASE_ROLE con el rol limitado de la aplicación, distinto al administrador.",
      );
    await client.query("BEGIN");
    try {
      await client.query(
        await readFile(new URL("../migrations/001-contact-mail.sql", import.meta.url), "utf8"),
      );
      await client.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);
      await client.query(`GRANT SELECT, INSERT, UPDATE ON sip_contact_notifications TO "${role}"`);
      await client.query(`GRANT USAGE, SELECT ON SEQUENCE sip_contact_notifications_number_seq TO "${role}"`);
      await client.query("COMMIT");
      console.log("Migración aplicada con transacción. No se enviaron correos.");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } else {
    if (
      !process.env.RESEND_API_KEY ||
      !/@(?:[a-z0-9-]+\.)*sipintegrales\.com$/i.test(process.env.CONTACT_MAIL_FROM ?? "")
    )
      throw new Error("Faltan RESEND_API_KEY o CONTACT_MAIL_FROM.");
    const { rows: counts } = await client.query(
      "SELECT status, count(*)::text AS count FROM sip_contact_notifications GROUP BY status ORDER BY status",
    );
    console.log(counts);
    console.log(
      "Configuración y base verificadas. La entrega real requiere enviar el formulario publicado y revisar la bandeja de Humberto.",
    );
  }
} catch {
  console.error(
    "Falló la comprobación. Revisa conexión, nombre de base, rol y configuración; no se muestran credenciales.",
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
