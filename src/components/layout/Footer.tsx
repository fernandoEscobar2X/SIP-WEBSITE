import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/Logo";
import { href } from "@/i18n/routes";
import type { Locale } from "@/i18n/routing";
import { site, waLink } from "@/lib/site";
import { TransitionLink } from "@/motion/transitions/TransitionLink";
import styles from "./chrome.module.css";

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Nav");
  const wa = await getTranslations("WhatsApp");
  const year = new Date().getFullYear();

  const links = [
    { href: href(locale, "services"), label: nav("services") },
    { href: href(locale, "about"), label: nav("about") },
    { href: href(locale, "contact"), label: nav("contact") },
  ];

  return (
    <footer className={styles.footer} data-surface="marino">
      <div className="container-site">
        <div className={styles.footerGrid}>
          <p className={styles.footerStatement}>{t("statement")}</p>

          <div className={styles.footerCols}>
            <ul className={styles.footerList}>
              <li>
                <span className={styles.footerLabel}>{t("emailLabel")}</span>
                <a className={styles.footerLink} href={`mailto:${site.email}`}>
                  {site.email}
                </a>
              </li>
              <li>
                <span className={styles.footerLabel}>{t("whatsappLabel")}</span>
                <a
                  className={styles.footerLink}
                  href={waLink(wa("message"))}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {site.whatsapp.display}
                </a>
              </li>
              <li>{t("location")}</li>
            </ul>

            <nav aria-label={nav("footer")}>
              <ul className={styles.footerList}>
                {links.map((link) => (
                  <li key={link.href}>
                    <TransitionLink className={styles.footerLink} href={link.href}>
                      {link.label}
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className={styles.footerBase}>
          <Logo className={styles.footerLogo} />
          <p>
            © {year} {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
