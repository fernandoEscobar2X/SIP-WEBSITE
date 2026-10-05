"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import ctaStyles from "@/components/ui/cta.module.css";
import styles from "./contact.module.css";
import {
  CONTACT_FORM_NAME,
  type ContactErrorCode,
  type ContactErrors,
  type ContactField,
  contactFields,
  HONEYPOT_FIELD,
  type IndustryOption,
  industryOptions,
  toNetlifyBody,
  validateContact,
} from "./schema";

/** Endpoint de Netlify Forms: el formulario estático que Netlify detecta al publicar. */
const FORMS_ENDPOINT = "/__forms.html";

export interface ContactFormText {
  readonly label: string;
  readonly fields: Record<ContactField, string>;
  readonly optional: string;
  readonly industryNone: string;
  readonly industries: Record<IndustryOption, string>;
  readonly submit: string;
  readonly sending: string;
  readonly sentTitle: string;
  /** Confirma recepción del formulario, no entrega de correo. `{email}` es el correo de SIP. */
  readonly sent: string;
  /** Con `{email}` para el correo de SIP. */
  readonly failed: string;
  readonly summary: string;
  readonly errors: Record<ContactErrorCode, string>;
  /** Descripciones para agentes (WebMCP). */
  readonly agent: { readonly tool: string } & Record<ContactField, string>;
}

interface ContactFormProps {
  readonly locale: string;
  readonly email: string;
  readonly text: ContactFormText;
}

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "failed" };

const OPTIONAL = new Set<ContactField>(["empresa", "telefono", "industria"]);

function readValues(form: HTMLFormElement): Record<ContactField, string> {
  const data = new FormData(form);
  return Object.fromEntries(contactFields.map((field) => [field, String(data.get(field) ?? "")])) as Record<
    ContactField,
    string
  >;
}

/**
 * Formulario de contacto.
 * - Sin JavaScript es un formulario normal que Netlify procesa (método POST + form-name).
 * - Con JavaScript valida en el idioma del visitante, envía sin recargar y anuncia el resultado.
 * - Expuesto a agentes con WebMCP; si lo envía un agente, recibe el resultado estructurado.
 */
export function ContactForm({ locale, email, text }: ContactFormProps) {
  const id = useId();
  const statusRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // La confirmación reemplaza al formulario (y al botón que tenía el foco): el foco pasa a ella
  // en cuanto existe. En un efecto, no en un rAF: el rAF puede correr antes del commit (WebKit).
  useEffect(() => {
    if (status.kind === "sent") statusRef.current?.focus();
  }, [status.kind]);

  const fieldId = (field: ContactField) => `${id}-${field}`;
  const errorId = (field: ContactField) => `${id}-${field}-error`;

  async function send(
    form: HTMLFormElement,
  ): Promise<{ status: "sent" | "invalid" | "failed"; errors?: ContactErrors }> {
    if (sendingRef.current) return { status: "failed" };
    const result = validateContact(readValues(form));
    if (!result.ok) {
      setErrors(result.errors);
      const first = contactFields.find((field) => result.errors[field]);
      if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return { status: "invalid", errors: result.errors };
    }
    setErrors({});
    sendingRef.current = true;
    setStatus({ kind: "sending" });
    const trap = String(new FormData(form).get(HONEYPOT_FIELD) ?? "");
    try {
      const response = await fetch(FORMS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: toNetlifyBody(result.data, locale, trap),
        signal: AbortSignal.timeout(20_000),
        redirect: "error",
      });
      if (!response.ok) throw new Error(`Netlify Forms respondió ${response.status}`);
      // El 200 confirma recepción por Netlify; la notificación se procesa en un evento separado.
      setStatus({ kind: "sent" });
      return { status: "sent" };
    } catch {
      setStatus({ kind: "failed" });
      return { status: "failed" };
    } finally {
      sendingRef.current = false;
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submission = send(event.currentTarget);
    const native = event.nativeEvent as SubmitEvent;
    if (native.agentInvoked && typeof native.respondWith === "function") native.respondWith(submission);
  };

  // Un campo con error se revalida mientras se escribe: el mensaje desaparece en cuanto el valor
  // es válido. No al perder el foco: el mensaje que se va movería el botón entre el mousedown y
  // el mouseup, y el clic de "Enviar" se perdería.
  const onInput = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target as HTMLInputElement;
    const field = target.name as ContactField;
    if (!errors[field]) return;
    const result = validateContact(readValues(event.currentTarget));
    setErrors((current) => ({ ...current, [field]: result.ok ? undefined : result.errors[field] }));
  };

  if (status.kind === "sent") {
    return (
      <div ref={statusRef} className={styles.sent} tabIndex={-1} role="status">
        <p className={styles.sentTitle}>{text.sentTitle}</p>
        <p>{text.sent.replace("{email}", email)}</p>
      </div>
    );
  }

  const invalid = Object.values(errors).some(Boolean);
  const sending = status.kind === "sending";

  const renderLabel = (field: ContactField) => (
    <label htmlFor={fieldId(field)} className={styles.label}>
      {text.fields[field]}
      {OPTIONAL.has(field) ? <span className={styles.optional}> ({text.optional})</span> : null}
    </label>
  );

  const describe = (field: ContactField) => ({
    id: fieldId(field),
    name: field,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? errorId(field) : undefined,
    toolparamdescription: text.agent[field],
  });

  const renderError = (field: ContactField) => {
    const code = errors[field];
    return code ? (
      <p id={errorId(field)} className={styles.error}>
        {text.errors[code]}
      </p>
    ) : null;
  };

  return (
    <form
      name={CONTACT_FORM_NAME}
      method="post"
      action={FORMS_ENDPOINT}
      noValidate
      aria-label={text.label}
      aria-busy={sending}
      className={styles.form}
      onSubmit={onSubmit}
      onInput={onInput}
      toolname="contactar_sip"
      tooldescription={text.agent.tool}
    >
      <input type="hidden" name="form-name" value={CONTACT_FORM_NAME} />
      <input type="hidden" name="idioma" value={locale} />
      <div className={styles.trap} aria-hidden="true">
        <label>
          {HONEYPOT_FIELD}
          <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          {renderLabel("nombre")}
          <input {...describe("nombre")} type="text" autoComplete="name" required maxLength={80} />
          {renderError("nombre")}
        </div>
        <div className={styles.field}>
          {renderLabel("empresa")}
          <input {...describe("empresa")} type="text" autoComplete="organization" maxLength={120} />
          {renderError("empresa")}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          {renderLabel("correo")}
          <input
            {...describe("correo")}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={254}
          />
          {renderError("correo")}
        </div>
        <div className={styles.field}>
          {renderLabel("telefono")}
          <input {...describe("telefono")} type="tel" autoComplete="tel" inputMode="tel" maxLength={20} />
          {renderError("telefono")}
        </div>
      </div>

      <div className={styles.field}>
        {renderLabel("industria")}
        <select {...describe("industria")} defaultValue="" className={styles.select}>
          <option value="">{text.industryNone}</option>
          {industryOptions.map((option) => (
            <option key={option} value={option}>
              {text.industries[option]}
            </option>
          ))}
        </select>
        {renderError("industria")}
      </div>

      <div className={styles.field}>
        {renderLabel("mensaje")}
        <textarea {...describe("mensaje")} rows={4} required minLength={10} maxLength={2000} />
        {renderError("mensaje")}
      </div>

      <div className={styles.actions}>
        <button type="submit" className={`${ctaStyles.cta} ${ctaStyles.large}`} disabled={sending}>
          {sending ? text.sending : text.submit}
        </button>
        <p className={styles.feedback} role="status" aria-live="polite">
          {status.kind === "failed" ? text.failed.replace("{email}", email) : invalid ? text.summary : ""}
        </p>
      </div>
    </form>
  );
}
