import { expect, test } from "@playwright/test";

test.describe("servicios en la home", () => {
  test("cada servicio enlaza a su detalle en la página de servicios", async ({ page }) => {
    await page.goto("/es");
    const section = page.getByRole("region", { name: "Lo que construimos." });
    const rows = section.getByRole("list").getByRole("link");
    await expect(rows).toHaveCount(8);
    for (const href of await rows.evaluateAll((links) => links.map((a) => a.getAttribute("href")))) {
      expect(href).toMatch(/^\/es\/servicios#[a-z-]+$/);
    }
    await expect(section.getByRole("link", { name: "Ver los servicios a detalle" })).toHaveAttribute(
      "href",
      "/es/servicios",
    );
  });
});
