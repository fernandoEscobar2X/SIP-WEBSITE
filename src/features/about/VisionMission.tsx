import { getTranslations } from "next-intl/server";
import { PurposeMotion } from "./AboutMotion";
import styles from "./about.module.css";

const STATEMENTS = ["vision", "mission"] as const;

/**
 * Visión y misión, la pieza tipográfica de Nosotros: cada palabra es enorme en Hubot y se ensambla
 * letra por letra al pasar por ella (`PurposeMotion`). La declaración va en su propia columna y la
 * palabra no se parte, así que el ensamble no mueve nada más. Sin JS o con movimiento reducido,
 * todo se ve completo y quieto.
 */
export async function VisionMission() {
  const t = await getTranslations("About.purpose");
  return (
    <section data-surface="noche" className={styles.purpose} aria-labelledby="nosotros-proposito">
      <h2 id="nosotros-proposito" className="sr-only">
        {t("label")}
      </h2>
      <PurposeMotion className={`container-site ${styles.purposeList}`}>
        {STATEMENTS.map((key) => (
          <div key={key} className={styles.purposeRow} data-purpose>
            <h3 className={styles.purposeWord} data-kinetic>
              {t(`${key}.name`)}
            </h3>
            <p className={styles.purposeText} data-statement>
              {t(`${key}.text`)}
            </p>
          </div>
        ))}
      </PurposeMotion>
    </section>
  );
}
