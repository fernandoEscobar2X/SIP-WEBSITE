import { getTranslations } from "next-intl/server";
import { Picture } from "@/components/media/Picture";
import { IntroMotion } from "./AboutMotion";
import styles from "./about.module.css";

/**
 * Apertura de Nosotros: el titular a la izquierda y el Pacífico en una banda a la derecha, con el
 * corte de 6° de la I en su borde. En móvil la toma vertical va arriba, cortada abajo.
 *
 * La banda se descubre con una cortina de noche que se retira en el ángulo de la I. Es CSS (no
 * espera a la hidratación) y tapa la foto en vez de recortarla: la foto se pinta completa desde el
 * primer cuadro, así que la animación no retrasa el LCP. El titular nunca arranca invisible.
 */
export async function AboutIntro() {
  const t = await getTranslations("About.intro");
  return (
    <section data-surface="noche" className={styles.intro} aria-labelledby="nosotros-titulo">
      <IntroMotion className={styles.introStage}>
        <div className={`container-site ${styles.introText}`}>
          <h1 id="nosotros-titulo" className={styles.introTitle}>
            {t("title")}
          </h1>
          <p className={styles.introLead}>{t("lead")}</p>
        </div>
        <div className={styles.band}>
          <div className={styles.bandFrame}>
            <div className={styles.bandMedia} data-parallax>
              <Picture
                landscape="nosotros-pacifico-h"
                portrait="nosotros-pacifico-v"
                sizes="(min-width: 64rem) 56vw, 100vw"
                alt=""
                loading="eager"
                fetchPriority="high"
                className={styles.fill}
                imgClassName={styles.cover}
              />
            </div>
            <div className={styles.bandCurtain} aria-hidden="true" />
          </div>
        </div>
      </IntroMotion>
    </section>
  );
}
