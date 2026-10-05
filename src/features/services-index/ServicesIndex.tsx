import { hasLocale } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { href } from "@/i18n/routes";
import { routing } from "@/i18n/routing";
import { services } from "./marks";
import { type ServiceItem, ServicesIndexClient } from "./ServicesIndexClient";
import styles from "./services.module.css";

/**
 * Índice de servicios (Fase 2): la capacidad, en concreto, con salida a la página de servicios.
 * Afirma lo que la microdemo de la sección siguiente demuestra.
 */
export async function ServicesIndex() {
  const locale = await getLocale();
  const t = await getTranslations("Services");
  const base = href(hasLocale(routing.locales, locale) ? locale : routing.defaultLocale, "services");
  const items: ServiceItem[] = services.map((id) => ({
    id,
    name: t(`items.${id}.name`),
    text: t(`items.${id}.text`),
    href: `${base}#${t(`items.${id}.anchor`)}`,
  }));

  return (
    <section data-surface="blanco" className={styles.section} aria-labelledby="servicios-titulo">
      <div className="container-site">
        <ServicesIndexClient
          items={items}
          more={{ href: base, text: t("cta") }}
          header={
            <header className={styles.header}>
              <h2 id="servicios-titulo" className={styles.title}>
                {t("title")}
              </h2>
              <p className={styles.lead}>{t("lead")}</p>
            </header>
          }
        />
      </div>
    </section>
  );
}
