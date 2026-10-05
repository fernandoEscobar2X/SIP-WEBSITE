import { hasLocale } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { heroIndustries } from "@/content/industries";
import { localeTag, routing } from "@/i18n/routing";
import { site, waLink } from "@/lib/site";
import { ContactForm, type ContactFormText } from "./ContactForm";
import { CopyEmail } from "./CopyEmail";
import styles from "./contact.module.css";
import { contactFields, type IndustryOption } from "./schema";
import { TijuanaTime } from "./TijuanaTime";

interface ContactSectionProps {
  /** h1 en la página de contacto, h2 al final de la home. */
  readonly headingLevel?: 1 | 2;
}

const FIELD_KEYS = {
  nombre: "name",
  empresa: "company",
  correo: "email",
  telefono: "phone",
  industria: "industry",
  mensaje: "message",
} as const;

/**
 * Contacto: titular, canales directos (correo que se copia, WhatsApp, hora en Tijuana) y el
 * formulario. Superficie clara: el contenido de lectura vive en superficies claras.
 */
export async function ContactSection({ headingLevel = 2 }: ContactSectionProps) {
  const locale = await getLocale();
  const t = await getTranslations("Contact");
  const industries = await getTranslations("Industries");
  const whatsapp = await getTranslations("WhatsApp");
  const Heading = headingLevel === 1 ? "h1" : "h2";

  const text: ContactFormText = {
    label: t("form.label"),
    fields: Object.fromEntries(
      contactFields.map((field) => [field, t(`form.${FIELD_KEYS[field]}`)]),
    ) as Record<(typeof contactFields)[number], string>,
    optional: t("form.optional"),
    industryNone: t("form.industryNone"),
    industries: {
      ...(Object.fromEntries(heroIndustries.map((id) => [id, industries(`${id}.name`)])) as Record<
        (typeof heroIndustries)[number],
        string
      >),
      otra: t("form.industryOther"),
    } satisfies Record<IndustryOption, string>,
    submit: t("form.submit"),
    sending: t("form.sending"),
    sentTitle: t("form.sentTitle"),
    sent: t.raw("form.sent") as string,
    failed: t.raw("form.failed") as string,
    summary: t("form.summary"),
    errors: {
      required: t("form.errors.required"),
      tooShort: t("form.errors.tooShort"),
      tooLong: t("form.errors.tooLong"),
      email: t("form.errors.email"),
      phone: t("form.errors.phone"),
      invalid: t("form.errors.invalid"),
    },
    agent: {
      tool: t("agent.tool"),
      ...(Object.fromEntries(
        contactFields.map((field) => [field, t(`agent.${FIELD_KEYS[field]}`)]),
      ) as Record<(typeof contactFields)[number], string>),
    },
  };

  return (
    <section id="contacto" data-surface="blanco" className={styles.section} aria-labelledby="contacto-titulo">
      <div className={`container-site ${styles.layout}`}>
        <div className={styles.intro}>
          <Heading id="contacto-titulo" className={styles.title}>
            {t("title")}
          </Heading>
          <p className={styles.lead}>{t("lead")}</p>
          <dl className={styles.channels} aria-label={t("channels")}>
            <div className={styles.channel}>
              <dt>{t("emailLabel")}</dt>
              <dd className={styles.channelValue}>
                <a href={`mailto:${site.email}`}>{site.email}</a>
                <CopyEmail email={site.email} copy={t("copy")} copied={t("copied")} />
              </dd>
            </div>
            <div className={styles.channel}>
              <dt>{t("whatsappLabel")}</dt>
              <dd className={styles.channelValue}>
                <a href={waLink(whatsapp("message"))} rel="noopener">
                  {site.whatsapp.display}
                </a>
              </dd>
            </div>
            <div className={styles.channel}>
              <dt>{t("timeLabel")}</dt>
              <dd className={styles.channelValue}>
                <TijuanaTime
                  locale={hasLocale(routing.locales, locale) ? localeTag[locale].lang : locale}
                  timeZone={site.timeZone}
                  yourTime={t.raw("yourTime") as string}
                />
              </dd>
            </div>
          </dl>
        </div>
        <ContactForm locale={locale} email={site.email} text={text} />
      </div>
    </section>
  );
}
