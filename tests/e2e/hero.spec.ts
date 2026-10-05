import { expect, type Page, test } from "@playwright/test";
import { isDesktop } from "./form";

async function openAt(page: Page, hour: number) {
  await page.clock.install({ time: new Date(2026, 8, 30, hour, 15) });
  await page.goto("/es");
}

/**
 * El recorrido arrancó: la pill activa ya pinta su progreso. Adelantar el reloj antes de eso (la
 * página aún hidratando) no movería un temporizador que todavía no existe. Es una espera de
 * preparación, no una medida de la experiencia: con varios navegadores en frío a la vez la
 * hidratación puede pasar de los 5 s por defecto, así que lleva el mismo margen que la demo.
 */
async function tourStarted(page: Page) {
  await expect
    .poll(
      () =>
        page
          .locator('[role="tab"][aria-selected="true"]')
          .evaluate((tab: HTMLElement) => tab.style.getPropertyValue("--progress")),
      { timeout: 15_000 },
    )
    .not.toBe("");
}

test.describe("hero por industria", () => {
  test("elige la foto de día o de noche según la hora del visitante y precarga solo esa", async ({
    page,
  }) => {
    for (const [hour, daypart] of [
      [11, "dia"],
      [22, "noche"],
    ] as const) {
      await openAt(page, hour);
      await expect(page.locator("html")).toHaveAttribute("data-daypart", daypart);
      const preloads = page.locator('link[rel="preload"][as="image"]');
      await expect(preloads).toHaveCount(2);
      for (const srcset of await preloads.evaluateAll((links) =>
        links.map((l) => l.getAttribute("imagesrcset")),
      )) {
        expect(srcset).toContain(`hero-manufactura-${daypart}-`);
      }
      const visible = page.locator('[data-slide="0"] img').filter({ visible: true });
      await expect(visible).toHaveCount(1);
      await expect(visible).toHaveJSProperty("complete", true);
      expect(await visible.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain(`-${daypart}-`);
    }
  });

  test("las pestañas funcionan con teclado y cada panel dice qué mide SIP", async ({ page }) => {
    await openAt(page, 22);
    const tabs = page.getByRole("tablist", { name: "Industrias" });
    const first = tabs.getByRole("tab", { name: "Manufactura" });
    await expect(first).toHaveAttribute("aria-selected", "true");
    await first.focus();
    await page.keyboard.press("ArrowRight");
    const logistics = tabs.getByRole("tab", { name: "Logística" });
    await expect(logistics).toBeFocused();
    await expect(logistics).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel", { name: "Logística" })).toContainText("tráiler");
    await page.keyboard.press("End");
    await expect(tabs.getByRole("tab", { name: "Energía" })).toHaveAttribute("aria-selected", "true");
  });

  test("el recorrido avanza solo", async ({ page }) => {
    await openAt(page, 22);
    await page.mouse.move(0, 0);
    await tourStarted(page);
    // Saltar el reloj (no cuadro por cuadro) y dejar correr un par de cuadros, como una pestaña real.
    await page.clock.fastForward(8000);
    await page.clock.runFor(100);
    await expect(page.getByRole("tab", { name: "Logística" })).toHaveAttribute("aria-selected", "true");
  });

  test("un clic durante un cambio en curso no se pierde", async ({ page }) => {
    await openAt(page, 22);
    const tabs = page.getByRole("tablist", { name: "Industrias" });
    await tabs.getByRole("tab", { name: "Logística" }).click();
    await tabs.getByRole("tab", { name: "Energía" }).click();
    const energy = tabs.getByRole("tab", { name: "Energía" });
    await expect(energy).toHaveAttribute("aria-selected", "true");
    // El corte dura ~1 s y la foto ya está precargada o espera como máximo 350 ms.
    await page.clock.fastForward(2500);
    await page.clock.runFor(200);
    await expect(page.locator('[data-slide][data-state="active"]')).toHaveAttribute("id", "hero-energia");
  });

  test("con movimiento reducido no avanza solo y el titular se ve completo", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openAt(page, 22);
    await expect(page.locator("html")).not.toHaveAttribute("data-motion", "on");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("opacity", "1");
    await page.clock.fastForward(16000);
    await page.clock.runFor(100);
    await expect(page.getByRole("tab", { name: "Manufactura" })).toHaveAttribute("aria-selected", "true");
  });

  test("móvil: un swipe horizontal cambia de industria", async ({ page }, info) => {
    test.skip(isDesktop(info), "el gesto es de pantallas táctiles");
    await openAt(page, 22);
    const box = await page.locator('[data-slide="0"]').boundingBox();
    if (!box) throw new Error("Sin panel del hero");
    const y = box.y + box.height * 0.3;
    await page.dispatchEvent('[data-slide="0"]', "pointerdown", {
      pointerType: "touch",
      clientX: box.x + box.width * 0.8,
      clientY: y,
    });
    await page.dispatchEvent('[data-slide="0"]', "pointerup", {
      pointerType: "touch",
      clientX: box.x + box.width * 0.2,
      clientY: y,
    });
    await expect(page.getByRole("tab", { name: "Logística" })).toHaveAttribute("aria-selected", "true");
  });
});
