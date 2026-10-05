import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Picture } from "@/components/media/Picture";
import { IRevealMotion } from "./IRevealMotion";
import styles from "./reveal.module.css";

/**
 * "La I que se abre": en el titular, la i de "decisión" es la I de SIP, inclinada 6°, y es una
 * ventana a la planta. Con el scroll la sección se fija, el titular se abre alrededor de la I y
 * la ventana crece hasta ocupar la pantalla. Sin JavaScript o con movimiento reducido se ve la
 * composición estática: el titular (con la I de la marca) y la imagen en un marco a 6°.
 */
export async function IReveal() {
  const t = await getTranslations("Reveal");
  const title = t.rich("title", {
    portal: (letter: ReactNode) => (
      <span className={styles.portal} data-portal>
        <span className="sr-only">{letter}</span>
      </span>
    ),
  });

  return (
    <section data-surface="noche" className={styles.section} aria-labelledby="revelado-titulo">
      <IRevealMotion>
        <div className={styles.stage} data-stage>
          <div className={styles.window} data-window>
            <Picture
              landscape="i-reveal-h"
              portrait="i-reveal-v"
              sizes="100vw"
              alt=""
              className={styles.picture}
              imgClassName={styles.image}
            />
            <div className={styles.shade} />
          </div>
          <h2 id="revelado-titulo" className={`container-site ${styles.title}`} data-title>
            {title}
          </h2>
        </div>
      </IRevealMotion>
    </section>
  );
}
