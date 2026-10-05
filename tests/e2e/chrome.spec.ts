import { expect, test } from "@playwright/test";
import { isDesktop } from "./form";

test.describe("cromo del sitio", () => {
  test("la home carga en español con su titular", async ({ page }) => {
    await page.goto("/es");
    await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en$/);
  });

  test("navega con transición y el header toma el tono de la superficie", async ({ page }, info) => {
    test.skip(!isDesktop(info), "la navegación principal de desktop vive en el header");
    await page.goto("/es");
    await expect(page.getByRole("banner")).toHaveAttribute("data-tone", "dark");
    await page
      .getByRole("navigation", { name: "Navegación principal" })
      .getByRole("link", { name: "Servicios" })
      .click();
    await expect(page).toHaveURL(/\/es\/servicios$/);
    await expect(page.getByRole("heading", { level: 1, name: "Servicios" })).toBeVisible();
    await expect(page.getByRole("banner")).toHaveAttribute("data-tone", "light");
  });

  test("el cambio de idioma conserva la página con su slug traducido", async ({ page }) => {
    await page.goto("/es/servicios");
    await page.getByRole("link", { name: "English" }).first().click();
    await expect(page).toHaveURL(/\/en\/services$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("una ruta inexistente responde 404 en su idioma", async ({ page }) => {
    const response = await page.goto("/en/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page doesn’t exist.");
  });

  test("no hay desplazamiento horizontal", async ({ page }) => {
    for (const path of ["/es", "/en/services", "/es/contacto"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("WhatsApp", () => {
  test("desktop: el botón se transforma en panel con QR y vuelve con Esc", async ({ page }, info) => {
    test.skip(!isDesktop(info), "el panel con QR es solo para desktop");
    await page.goto("/es");
    const trigger = page.getByRole("button", { name: "WhatsApp" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Escríbenos por WhatsApp" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("img", { name: /Código QR/ })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cerrar" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "WhatsApp" })).toBeFocused();
  });

  test("móvil: WhatsApp abre el chat directo con el número de SIP", async ({ page }, info) => {
    test.skip(isDesktop(info), "en móvil es un enlace directo");
    await page.goto("/es");
    const link = page.getByRole("link", { name: "WhatsApp" }).first();
    await expect(link).toHaveAttribute("href", /^https:\/\/wa\.me\/526645296002\?text=/);
  });
});

test.describe("menú móvil", () => {
  test("abre a pantalla completa y cierra con Esc", async ({ page }, info) => {
    test.skip(isDesktop(info), "solo móvil");
    await page.goto("/es");
    await page.getByRole("button", { name: "Menú" }).click();
    const menu = page.getByRole("dialog", { name: "Menú" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "Servicios" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});

test.describe("movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });

  test("la navegación funciona sin animaciones", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("contentinfo").getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/en\/about$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Technology for operations, from the Pacific." }),
    ).toBeVisible();
  });
});
