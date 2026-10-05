import { getTranslations } from "next-intl/server";

type Key = "services";

/**
 * Esqueleto de páginas interiores (Fase 0): titular y bajada desde Meta.*.
 * Cada página recibe su contenido real en la Fase 3.
 */
export async function PageShellView({ page }: { page: Key }) {
  const t = await getTranslations(`Meta.${page}`);
  return (
    <section data-surface="hielo" className="flex min-h-[80svh] items-end pt-40 pb-24">
      <div className="container-site">
        <h1 className="type-title max-w-[16ch]">{t("title")}</h1>
        <p className="type-lead mt-8 max-w-[44ch] text-(--surface-muted)">{t("description")}</p>
      </div>
    </section>
  );
}
