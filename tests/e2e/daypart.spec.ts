import { expect, type Page, test } from "@playwright/test";

async function checkImage(page: Page, daypart: string) {
  await expect(page.locator("html")).toHaveAttribute("data-daypart", daypart);
  const image = page.locator('[data-slide][data-state="active"] img').filter({ visible: true });
  await expect(image).toHaveCount(1);
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.currentSrc))
    .toContain(`-${daypart}-`);
  await expect(image).toHaveJSProperty("complete", true);
  expect(await image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
}

test("la hidratación y la navegación conservan las imágenes y no reconstruyen la página", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install({ time: new Date(2026, 9, 5, 10) });
  await page.goto("/es");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
  await checkImage(page, "dia");
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(/\/en$/);
  await checkImage(page, "dia");
  await page.getByRole("link", { name: "Español", exact: true }).click();
  await expect(page).toHaveURL(/\/es$/);
  await checkImage(page, "dia");
  expect(errors).toEqual([]);
});

test("cambia al cruzar las 07:00 y 19:00 sin recargar", async ({ page }) => {
  for (const [hour, before, after] of [
    [6, "noche", "dia"],
    [18, "dia", "noche"],
  ] as const) {
    await page.clock.install({ time: new Date(2026, 9, 5, hour, 59, 50) });
    await page.goto("/es");
    await checkImage(page, before);
    await page.clock.fastForward(20_000);
    await page.clock.runFor(100);
    await checkImage(page, after);
  }
});

test("al volver a la pestaña corrige el reloj y respeta la preferencia de movimiento", async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 5, 10) });
  await page.goto("/es");
  await page.waitForLoadState("networkidle");
  await page.clock.setSystemTime(new Date(2026, 9, 5, 22));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await checkImage(page, "noche");
  await page.clock.setSystemTime(new Date(2026, 9, 6, 10));
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await checkImage(page, "dia");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveAttribute("data-motion", "on");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
});

test("usa la zona del visitante aunque difiera de Tijuana o del servidor", async ({ browser }) => {
  test.setTimeout(60_000); // Dos contextos independientes, con carga y cierre completos.
  for (const [timezoneId, daypart] of [
    ["America/Tijuana", "dia"],
    ["Asia/Tokyo", "noche"],
  ] as const) {
    const context = await browser.newContext({ timezoneId });
    const page = await context.newPage();
    await page.clock.install({ time: new Date("2026-10-05T17:00:00Z") });
    await page.goto("/es");
    await page.waitForLoadState("networkidle");
    await checkImage(page, daypart);
    await context.close();
  }
});
