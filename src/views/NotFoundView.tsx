import { getLocale, getTranslations } from "next-intl/server";
import { href } from "@/i18n/routes";
import { TransitionLink } from "@/motion/transitions/TransitionLink";

export async function NotFoundView() {
  const locale = await getLocale();
  const t = await getTranslations("NotFound");
  return (
    <section data-surface="noche" className="flex min-h-svh items-end pb-24">
      <div className="container-site">
        <h1 className="type-title max-w-[14ch]">{t("title")}</h1>
        <p className="type-lead mt-8 max-w-[40ch] text-(--surface-muted)">{t("lead")}</p>
        <TransitionLink
          href={href(locale, "home")}
          className="type-heading mt-10 inline-block underline underline-offset-8"
        >
          {t("back")}
        </TransitionLink>
      </div>
    </section>
  );
}
