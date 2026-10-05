-- Ejecutar con un usuario de migraciones; la función usa un usuario limitado a esta tabla y su secuencia.
CREATE TABLE IF NOT EXISTS sip_contact_notifications (
  number bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  data jsonb,
  email jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'review')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  first_attempt_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  provider_id text,
  sent_at timestamptz,
  last_error text,
  CHECK (status <> 'sent' OR (provider_id IS NOT NULL AND sent_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS sip_contact_notifications_due
  ON sip_contact_notifications (next_attempt_at, number) WHERE status IN ('pending', 'sending');
REVOKE ALL ON sip_contact_notifications FROM PUBLIC;
REVOKE ALL ON SEQUENCE sip_contact_notifications_number_seq FROM PUBLIC;
