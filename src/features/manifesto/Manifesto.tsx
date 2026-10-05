import { hasLocale } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Children, isValidElement, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Cta } from "@/components/ui/Cta";
import { href } from "@/i18n/routes";
import { routing } from "@/i18n/routing";
import { datatype } from "@/lib/simulated";
import { site } from "@/lib/site";
import { ManifestoMotion } from "./ManifestoMotion";
import styles from "./manifesto.module.css";
import { createReadings } from "./readings";

/** Semilla del simulador: el servidor y el navegador parten de la misma lectura. */
const MANIFESTO_SEED = 7;

type Datum = "line" | "clock" | "bars";

/** Filas de la placa, en orden de lectura: quién, para quién, con qué y qué resulta. */
const PLATE_ROWS = ["base", "industries", "connect", "deliver"] as const;

/** Divide el texto plano en palabras (con su espacio) para iluminarlas una a una. */
function words(node: ReactNode, key: string): ReactNode {
  if (typeof node !== "string") return node;
  return node.split(/(?<=\s)/).map((word, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: el texto es estático; el índice es la identidad de la palabra
    <span key={`${key}-${index}`} className={styles.word} data-word>
      {word}
    </span>
  ));
}

/**
 * Manifiesto: el párrafo se ilumina con el scroll y las palabras clave se vuelven datos vivos
 * (Datatype). Para lectores de pantalla y buscadores es un párrafo normal: las gráficas son
 * `aria-hidden` y el texto no cambia. Al lado, la placa de datos de SIP (como la placa de una
 * máquina) y el llamado a la acción hacia el formulario de la misma página.
 */
export async function Manifesto() {
  const locale = await getLocale();
  const t = await getTranslations("Manifesto");
  const home = await getTranslations("Home");
  const contactAnchor = `${href(hasLocale(routing.locales, locale) ? locale : routing.defaultLocale, "home")}#contacto`;
  const initial = createReadings({ seed: MANIFESTO_SEED }).snapshot();

  const keyword = (kind: Datum) => (chunks: ReactNode) => (
    <span className={styles.keyword} data-word data-keyword>
      {chunks}
      <span className={styles.datum} data-datum={kind} aria-hidden="true">
        {kind === "line"
          ? datatype.line(initial.throughput)
          : kind === "bars"
            ? datatype.bars(initial.lines)
            : "00:00:00"}
      </span>
    </span>
  );

  const rich = t.rich("text", { line: keyword("line"), clock: keyword("clock"), bars: keyword("bars") });
  const content = Children.toArray(rich).map((node, index) =>
    isValidElement(node) ? node : words(node, `p${index}`),
  );

  return (
    <section data-surface="hielo" className={styles.section} aria-labelledby="manifiesto-titulo">
      <div className="container-site">
        <h2 id="manifiesto-titulo" className="sr-only">
          {t("label")}
        </h2>
        <ManifestoMotion seed={MANIFESTO_SEED} timeZone={site.timeZone} className={styles.layout}>
          <p className={styles.text} data-manifesto-text>
            {content}
          </p>
          <div className={styles.aside}>
            <div className={styles.plate} data-plate>
              <p className={styles.plateHead}>
                <Logo className={styles.plateLogo} />
                <span>{site.name}</span>
              </p>
              <dl className={styles.plateRows} aria-label={t("plate.label")}>
                {PLATE_ROWS.map((row) => (
                  <div key={row} className={styles.plateRow} data-plate-row>
                    <dt>{t(`plate.${row}.label`)}</dt>
                    <dd>{t(`plate.${row}.value`)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <Cta href={contactAnchor} size="large">
              {home("heroCta")}
            </Cta>
          </div>
        </ManifestoMotion>
      </div>
    </section>
  );
}
