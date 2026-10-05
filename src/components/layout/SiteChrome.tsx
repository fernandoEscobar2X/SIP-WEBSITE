import { getTranslations } from "next-intl/server";
import { WhatsApp } from "@/features/whatsapp/WhatsApp";
import { href } from "@/i18n/routes";
import type { Locale } from "@/i18n/routing";
import { site, waLink } from "@/lib/site";
import styles from "./chrome.module.css";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

/**
 * Cromo común (servidor): resuelve textos y rutas, y entrega a los componentes
 * cliente solo props planas. Así no viaja el catálogo de mensajes al navegador.
 */
export async function SiteChrome({ locale }: { locale: Locale }) {
  const nav = await getTranslations("Nav");
  const header = await getTranslations("Header");
  const lang = await getTranslations("Language");
  const wa = await getTranslations("WhatsApp");
  const footer = await getTranslations("Footer");
  const skip = await getTranslations();

  const other: Locale = locale === "es" ? "en" : "es";
  const language = { to: other, label: lang("other") };

  const items = [
    { href: href(locale, "services"), label: nav("services") },
    { href: href(locale, "about"), label: nav("about") },
  ];
  const contact = { href: href(locale, "contact"), label: header("cta") };

  return (
    <>
      <a className={styles.skip} href="#contenido">
        {skip("SkipLink")}
      </a>
      <Header
        homeHref={href(locale, "home")}
        homeLabel={header("homeLink")}
        navLabel={nav("primary")}
        items={items}
        cta={contact}
        language={language}
      />
      <MobileNav
        menuLabel={header("menu")}
        closeLabel={header("closeMenu")}
        navLabel={nav("primary")}
        items={[
          { href: href(locale, "home"), label: nav("home") },
          ...items,
          { href: contact.href, label: nav("contact") },
        ]}
        whatsapp={{ href: waLink(wa("message")), label: wa("label") }}
        contact={{ email: site.email, phone: site.whatsapp.display, location: footer("location") }}
        language={language}
      />
      <WhatsApp />
    </>
  );
}
