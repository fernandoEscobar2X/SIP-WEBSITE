import { getLocale, getTranslations } from "next-intl/server";
import { site } from "@/lib/site";
import { whatsappQr } from "./qr.generated";
import { WhatsAppDock } from "./WhatsAppDock";
import { WhatsAppQr } from "./WhatsAppQr";

/** Envoltorio de servidor: textos y QR se resuelven aquí; el cliente solo recibe props. */
export async function WhatsApp() {
  const locale = await getLocale();
  const t = await getTranslations("WhatsApp");
  return (
    <WhatsAppDock
      href={whatsappQr[locale].url}
      number={site.whatsapp.display}
      labels={{ label: t("label"), title: t("title"), close: t("close"), openInApp: t("openInApp") }}
      qr={<WhatsAppQr locale={locale} label={t("qrLabel")} />}
    />
  );
}
