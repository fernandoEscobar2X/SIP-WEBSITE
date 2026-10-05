import { expect, test } from "@playwright/test";
import { isDesktop } from "./form";

test.describe("Nosotros", () => {
  test("carga en cada idioma con su titular y el cambio de idioma conserva la página", async ({ page }) => {
    await page.goto("/es/nosotros");
    await expect(
      page.getByRole("heading", { level: 1, name: "Tecnología para operar, desde el Pacífico." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Visión" })).toBeAttached();
    await page.getByRole("link", { name: "English" }).first().click();
    await expect(page).toHaveURL(/\/en\/about$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Technology for operations, from the Pacific." }),
    ).toBeVisible();
  });

  test("cierra con el formulario de contacto y no desborda a lo ancho", async ({ page }) => {
    await page.goto("/es/nosotros");
    await expect(page.locator("#contacto form")).toBeAttached();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("desktop: el ancho de Visión sigue la velocidad del scroll sin mover su declaración", async ({
    page,
  }, info) => {
    test.skip(!isDesktop(info), "en móvil la palabra solo entra una vez, sin seguir la velocidad");
    await page.goto("/es/nosotros");
    const word = page.getByRole("heading", { level: 3, name: "Visión" });
    const statement = word.locator("xpath=following-sibling::p");
    await word.scrollIntoViewIfNeeded();
    const stretch = () =>
      word.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontStretch));
    const offset = () => statement.evaluate((element) => (element as HTMLElement).offsetTop);
    await expect.poll(stretch).toBeGreaterThan(110);
    const rest = await stretch();
    const before = await offset();

    // Un scroll rápido condensa la palabra; al detenerse vuelve a su ancho.
    let narrowest = rest;
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, i % 2 === 0 ? 900 : -900);
      narrowest = Math.min(narrowest, await stretch());
      expect(await offset()).toBe(before);
    }
    expect(narrowest).toBeLessThan(rest);
    await expect.poll(stretch).toBeCloseTo(rest, 0);
  });
});

test.describe("Nosotros con movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });

  test("todo está a la vista desde el inicio", async ({ page }) => {
    await page.goto("/es/nosotros");
    const slit = page.locator("[data-slit]");
    await slit.scrollIntoViewIfNeeded();
    // La ventana conserva el recorte final del CSS (sin la rendija animada).
    expect(await slit.evaluate((element) => (element as HTMLElement).style.clipPath)).toBe("");
    for (const rule of await page.locator("[data-rule]").all()) {
      expect(await rule.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
    }
  });
});
