"use client";

import { useCallback, useRef } from "react";
import { WhatsAppGlyph } from "@/features/whatsapp/WhatsAppGlyph";
import type { Locale } from "@/i18n/routing";
import { gsap } from "@/motion/gsap";
import { prefersReducedMotion } from "@/motion/media";
import { duration, ease } from "@/motion/tokens";
import { TransitionLink } from "@/motion/transitions/TransitionLink";
import styles from "./chrome.module.css";
import type { NavItem } from "./Header";
import { LanguageSwitch } from "./LanguageSwitch";

type Props = {
  menuLabel: string;
  closeLabel: string;
  navLabel: string;
  items: NavItem[];
  whatsapp: { href: string; label: string };
  contact: { email: string; phone: string; location: string };
  language: { to: Locale; label: string };
};

/** Corte a 6° que barre de abajo hacia arriba (misma geometría que la I del logo). */
const CLOSED = "polygon(0% 100%, 100% 110%, 100% 110%, 0% 100%)";
const OPEN = "polygon(0% -10%, 100% 0%, 100% 110%, 0% 110%)";

export function MobileNav({ menuLabel, closeLabel, navLabel, items, whatsapp, contact, language }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      dialog,
      { clipPath: CLOSED },
      { clipPath: OPEN, duration: duration.base * 1.3, ease: ease.out.name },
    );
    gsap.fromTo(
      dialog.querySelectorAll("[data-menu-item]"),
      { yPercent: 60, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, stagger: 0.05, duration: duration.base, delay: duration.fast },
    );
  }, []);

  const close = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    if (prefersReducedMotion()) {
      dialog.close();
      return;
    }
    gsap.to(dialog, {
      clipPath: CLOSED,
      duration: duration.base,
      ease: ease.in.name,
      onComplete: () => dialog.close(),
    });
  }, []);

  return (
    <>
      <div className={styles.dock}>
        <button type="button" className={styles.dockButton} onClick={open} aria-haspopup="dialog">
          <span className={styles.dockMark} aria-hidden="true" />
          {menuLabel}
        </button>
        <a
          className={`${styles.dockButton} ${styles.dockWhatsapp}`}
          href={whatsapp.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={whatsapp.label}
        >
          <WhatsAppGlyph className={styles.dockGlyph} />
        </a>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.menu}
        aria-label={menuLabel}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <div className={styles.menuInner}>
          <nav aria-label={navLabel}>
            <ul className={styles.menuList}>
              {items.map((item) => (
                <li key={item.href} data-menu-item>
                  <TransitionLink href={item.href} className={styles.menuLink} onClick={close}>
                    {item.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.menuMeta} data-menu-item>
            <div className={styles.menuContact}>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
              <a href={whatsapp.href} target="_blank" rel="noopener noreferrer">
                {contact.phone}
              </a>
              <span>{contact.location}</span>
            </div>
            <LanguageSwitch to={language.to} label={language.label} className={styles.lang} />
          </div>

          <button type="button" className={styles.menuClose} onClick={close} data-menu-item>
            {closeLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
