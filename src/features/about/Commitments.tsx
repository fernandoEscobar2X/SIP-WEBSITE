import { getTranslations } from "next-intl/server";
import { CommitmentsMotion } from "./AboutMotion";
import styles from "./about.module.css";

/** Cada compromiso junta un pilar de la lámina con las razones de "¿Por qué SIP?" que dicen lo mismo. */
const COMMITMENTS = ["fit", "results", "direct", "lasting"] as const;

/**
 * Compromisos: filas separadas por filetes que se trazan al entrar. En desktop, el nombre de cada
 * compromiso pasa de condensado a su ancho al cruzar la vista; no hay fila "activa", para no
 * repetir el índice de servicios de la home.
 */
export async function Commitments() {
  const t = await getTranslations("About.commitments");
  return (
    <section data-surface="hielo" className={styles.commitments} aria-labelledby="nosotros-compromisos">
      <div className="container-site">
        <h2 id="nosotros-compromisos" className={styles.commitmentsTitle}>
          {t("title")}
        </h2>
        <CommitmentsMotion>
          <ul className={styles.commitmentList}>
            {COMMITMENTS.map((key) => (
              <li key={key} className={styles.commitment} data-commitment>
                <span className={styles.rule} data-rule aria-hidden="true" />
                <h3 className={styles.commitmentName} data-name>
                  {t(`items.${key}.name`)}
                </h3>
                <p className={styles.commitmentText}>{t(`items.${key}.text`)}</p>
              </li>
            ))}
          </ul>
        </CommitmentsMotion>
      </div>
    </section>
  );
}
