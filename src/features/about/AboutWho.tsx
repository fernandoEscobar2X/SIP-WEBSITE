import { getTranslations } from "next-intl/server";
import { Picture } from "@/components/media/Picture";
import { WhoMotion } from "./AboutMotion";
import styles from "./about.module.css";

/**
 * Quiénes somos: los tres oficios que junta SIP y, debajo, los parques industriales de Tijuana en
 * una ventana con el corte de la I que se abre con el scroll desde una rendija. Sin JavaScript o
 * con movimiento reducido, la ventana se ve abierta.
 */
export async function AboutWho() {
  const t = await getTranslations("About.who");
  return (
    <section data-surface="hielo" className={styles.who} aria-labelledby="nosotros-oficios">
      <WhoMotion className={`container-site ${styles.whoLayout}`}>
        <h2 id="nosotros-oficios" className={styles.whoTitle}>
          {t("title")}
        </h2>
        <p className={styles.whoText}>{t("text")}</p>
        <div className={styles.slit} data-slit>
          <Picture
            landscape="nosotros-tijuana-h"
            sizes="(min-width: 120rem) 112rem, 92vw"
            alt=""
            className={styles.fill}
            imgClassName={`${styles.cover} ${styles.slitImage}`}
          />
        </div>
      </WhoMotion>
    </section>
  );
}
