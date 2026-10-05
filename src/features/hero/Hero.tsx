import { getLocale, getTranslations } from "next-intl/server";
import { InlineScript } from "@/components/InlineScript";
import { Picture } from "@/components/media/Picture";
import { Cta } from "@/components/ui/Cta";
import { heroIndustries, heroMedia } from "@/content/industries";
import { href } from "@/i18n/routes";
import type { Daypart } from "@/lib/boot";
import { LANDSCAPE_QUERY, mediaSrcSet, PORTRAIT_QUERY } from "@/media";
import { entranceScript } from "./entrance";
import { HeroCarousel } from "./HeroCarousel";
import styles from "./hero.module.css";

const DAYPARTS = ["noche", "dia"] as const satisfies readonly Daypart[];

/**
 * Precarga de la primera imagen del hero para el momento del día que ya decidió el script de
 * arranque. Va en línea, antes de las imágenes: el navegador empieza a bajar el LCP mientras
 * sigue leyendo el HTML, y nunca baja la variante que no se va a ver.
 */
function preloadScript(): string {
  const [first] = heroIndustries;
  const sources = (daypart: Daypart) => {
    const { portrait, landscape } = heroMedia(first, daypart);
    return [
      { media: PORTRAIT_QUERY, srcset: mediaSrcSet(portrait, "avif") },
      { media: LANDSCAPE_QUERY, srcset: mediaSrcSet(landscape, "avif") },
    ];
  };
  const data = JSON.stringify({ dia: sources("dia"), noche: sources("noche") }).replace(/</g, "\\u003c");
  return `(function(p){var d=document,h=d.head;(p[d.documentElement.dataset.daypart]||p.noche).forEach(function(s){var l=d.createElement("link");l.rel="preload";l.as="image";l.type="image/avif";l.media=s.media;l.setAttribute("imagesrcset",s.srcset);l.setAttribute("imagesizes","100vw");l.setAttribute("fetchpriority","high");h.appendChild(l)})})(${data});`;
}

/**
 * Hero de la home: la operación de cada industria, a pantalla completa, de día o de noche
 * según la hora del visitante. Todo el marcado se renderiza en servidor; el cliente solo
 * orquesta el recorrido (HeroCarousel).
 */
export async function Hero() {
  const locale = await getLocale();
  const t = await getTranslations("Home");
  const hero = await getTranslations("Hero");
  const industries = await getTranslations("Industries");

  const slides = heroIndustries.map((id) => ({
    id,
    name: industries(`${id}.name`),
    measure: industries(`${id}.measure`),
  }));

  return (
    <section data-surface="noche" className={styles.hero} aria-labelledby="hero-titulo">
      {/* Precarga de la foto del momento del día (generada del manifiesto de medios, JSON escapado). */}
      <InlineScript html={preloadScript()} />
      <div className={`container-site ${styles.copy}`}>
        <h1 id="hero-titulo" className={styles.title}>
          {t.rich("heroTitle", {
            l: (line) => (
              <span className={styles.line}>
                <span className={styles.lineInner} data-entrance="line">
                  {line}
                </span>
              </span>
            ),
          })}
        </h1>
        <div className={`${styles.aside} ${styles.reveal}`} data-entrance="block">
          <p className={styles.lead}>{t("heroLead")}</p>
          <Cta href={`${href(locale, "home")}#contacto`} size="large">
            {t("heroCta")}
          </Cta>
        </div>
      </div>

      <HeroCarousel slides={slides} labels={{ carousel: hero("carousel"), industries: hero("industries") }}>
        {slides.map(({ id, measure }, index) => (
          <div
            key={id}
            id={`hero-${id}`}
            role="tabpanel"
            aria-labelledby={`hero-tab-${id}`}
            className={styles.slide}
            data-slide={index}
            data-state={index === 0 ? "active" : undefined}
            hidden={index > 0}
          >
            {DAYPARTS.map((daypart) => (
              <div key={daypart} className={styles.variant} data-daypart={daypart}>
                <Picture
                  {...heroMedia(id, daypart)}
                  sizes="100vw"
                  alt=""
                  loading="lazy"
                  fetchPriority={index === 0 ? "high" : "auto"}
                  className={styles.picture}
                  imgClassName={styles.image}
                />
              </div>
            ))}
            <div className={styles.scrim} />
            <p className="sr-only">{measure}</p>
          </div>
        ))}
      </HeroCarousel>
      {/* Entrada con Web Animations, independiente de la hidratación. */}
      <InlineScript html={entranceScript} />
    </section>
  );
}
