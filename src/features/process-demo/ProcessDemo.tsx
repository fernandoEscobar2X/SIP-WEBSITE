import { hasLocale } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { href } from "@/i18n/routes";
import { localeTag, routing } from "@/i18n/routing";
import { type AppState, Closing, type ProcessText, SupervisionApp } from "./app";
import { Diagram, OpenPort } from "./diagram";
import { ProcessDemoLoader } from "./ProcessDemoLoader";
import styles from "./process-demo.module.css";
import { INITIAL_LEVEL, type Layout, PROCESS, SCENES, TREND } from "./scene";

/**
 * Microdemo de proceso (Fase 2): la app de supervisión de una estación de bombeo, como las que
 * entrega SIP, con un tramo pendiente de conectar en modo edición. El servidor entrega el texto y
 * un póster de la app en su estado inicial; la interacción se carga al acercarse
 * (ProcessDemoLoader).
 */
export async function ProcessDemo() {
  const locale = await getLocale();
  const t = await getTranslations("Process");
  const site = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  // Cifras con las convenciones del idioma del sitio (es-MX: punto decimal).
  const lang = localeTag[site].lang;
  // Los textos de la app viajan completos al cliente: se toman del catálogo tipado del idioma.
  const { Process: messages } = await getMessages();
  const text: ProcessText = {
    diagram: messages.diagram,
    app: messages.app,
    edit: messages.edit,
    pump: messages.pump,
    valve: messages.valve,
    control: messages.control,
    summary: messages.summary,
    readouts: messages.readouts,
    trend: messages.trend,
    alarms: messages.alarms,
    events: messages.events,
    elbow: messages.elbow,
    cta: { ...messages.cta, href: `${href(site, "home")}#contacto` },
  };

  const format = (digits: number, value: number) =>
    new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
      value,
    );
  const blank = "--:--:--";
  const poster: AppState = {
    screen: "edit",
    view: "plant",
    connected: false,
    mode: "auto",
    running: false,
    pumpState: text.pump.noLine,
    tone: "idle",
    valve: 1,
    setpoints: { start: PROCESS.tank.start, stop: PROCESS.tank.stop },
    readings: { flow: format(1, 0), pressure: format(2, 0), level: format(0, INITIAL_LEVEL * 100) },
    trend: Array.from({ length: TREND.points }, () => INITIAL_LEVEL),
    summary: { volume: format(2, 0), starts: "0", runtime: "0:00" },
    log: [{ id: 0, time: blank, severity: "alarm", text: text.events.lineOpen, status: "active" }],
    clock: blank,
    toast: null,
  };
  const diagram = (layout: Layout) => {
    const { headerPort, tankPort } = SCENES[layout];
    return (
      <Diagram
        key={layout}
        layout={layout}
        label={text.diagram}
        opening={1}
        readings={poster.readings}
        tone="idle"
        className={`${styles.svg} ${layout === "h" ? styles.desktopOnly : styles.mobileOnly}`}
        overlay={
          <>
            <OpenPort x={headerPort.x} y={headerPort.y} />
            <OpenPort x={tankPort.x} y={tankPort.y} />
          </>
        }
      />
    );
  };

  return (
    <section id="proceso" data-surface="noche" className={styles.section} aria-labelledby="proceso-titulo">
      <div className="container-site">
        <header className={styles.header}>
          <h2 id="proceso-titulo" className={styles.title}>
            {t("title")}
          </h2>
          <p className={styles.lead}>{t("lead")}</p>
        </header>
        <ProcessDemoLoader text={text} locale={lang}>
          <div className={styles.stage}>
            <SupervisionApp
              text={text}
              state={poster}
              canvas={
                <div className={styles.canvas}>
                  {diagram("h")}
                  {diagram("v")}
                </div>
              }
            />
            <Closing text={text} />
          </div>
        </ProcessDemoLoader>
      </div>
    </section>
  );
}
