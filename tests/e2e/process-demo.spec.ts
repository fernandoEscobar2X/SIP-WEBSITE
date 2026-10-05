import { expect, type Page, type TestInfo, test } from "@playwright/test";
import { isDesktop } from "./form";

/** Lectura accesible de un instrumento como número (es-MX: punto decimal). */
async function reading(page: Page, which: "flow" | "pressure" | "level"): Promise<number> {
  const text = await page.locator(`#proceso dd[data-reading="${which}"]`).textContent();
  return Number.parseFloat((text ?? "").replace(/\s.*$/, ""));
}

async function openDemo(page: Page) {
  await page.goto("/es");
  const section = page.locator("#proceso");
  // El póster del servidor trae la misma app con los mandos deshabilitados: está lista cuando la
  // versión interactiva los habilita. Si el scroll llega antes de que la página hidrate, los pines
  // de arriba empujan la sección fuera del margen de carga: como un visitante, se vuelve a llegar.
  const ready = page.getByRole("button", { name: "Conectar con la ruta sugerida" });
  await expect(async () => {
    await section.scrollIntoViewIfNeeded();
    await expect(ready).toBeEnabled({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
}

/** En móvil la app muestra una vista a la vez; en desktop todas están a la vista. */
async function show(page: Page, info: TestInfo, view: "Planta" | "Mando" | "Tendencia" | "Alarmas") {
  if (isDesktop(info)) return;
  await page
    .getByRole("navigation", { name: "Vistas de la app" })
    .getByRole("button", { name: new RegExp(`^${view}`) })
    .click();
}

async function canvas(page: Page, info: TestInfo) {
  const layout = isDesktop(info) ? "h" : "v";
  const svg = page.locator(`#proceso svg[data-layout="${layout}"]`);
  const box = await svg.boundingBox();
  const viewBox = await svg.getAttribute("viewBox");
  if (!box || !viewBox) throw new Error("Sin lienzo de la microdemo");
  const scale = box.width / Number(viewBox.split(" ")[2]);
  const at = (x: number, y: number) => [box.x + x * scale, box.y + y * scale] as const;
  return { layout, at };
}

const pumpState = (page: Page) => page.locator("#proceso [role=status]");
const log = (page: Page) => page.locator("#proceso ul[aria-live]");

test.describe("microdemo: la app de supervisión", () => {
  // La hidráulica corre en tiempo real (arranques, maniobras): más margen que el estándar.
  test.describe.configure({ timeout: 60_000 });

  test("conectar con la ruta sugerida pasa a operación y el control arranca la bomba", async ({
    page,
  }, info) => {
    await openDemo(page);
    await expect(pumpState(page)).toHaveText("Sin línea");
    await expect(log(page)).toContainText("Tramo sin conectar");
    await page.getByRole("button", { name: "Conectar con la ruta sugerida" }).click();

    await expect(page.getByRole("button", { name: "Operación" })).toHaveAttribute("aria-pressed", "true");
    // En automático, con el tanque abajo del paro, el control arranca solo.
    await expect(pumpState(page)).toHaveText("En marcha");
    await expect.poll(() => reading(page, "flow"), { timeout: 8000 }).toBeGreaterThan(8);
    const runningPressure = await reading(page, "pressure");

    await show(page, info, "Mando");
    await page.getByRole("slider", { name: /Válvula XV-101/ }).fill("0");
    await expect.poll(() => reading(page, "flow"), { timeout: 8000 }).toBe(0);
    // Sin caudal, la descarga sube a la carga de cierre de la bomba (32 m ≈ 3.14 bar).
    await expect.poll(() => reading(page, "pressure"), { timeout: 8000 }).toBeGreaterThan(runningPressure);
    expect(await reading(page, "pressure")).toBeCloseTo(3.14, 1);
    await expect(log(page)).toContainText("XV-101 cerrada con P-101 en marcha");

    await show(page, info, "Planta");
    await page.getByRole("button", { name: "Edición" }).click();
    await page.getByRole("button", { name: "Quitar el tramo" }).click();
    await expect(pumpState(page)).toHaveText("Sin línea");
    await expect(page.getByRole("button", { name: "Conectar con la ruta sugerida" })).toBeVisible();
  });

  test("el control obedece el punto de paro que fija el operador", async ({ page }, info) => {
    await openDemo(page);
    await show(page, info, "Mando");
    // El tanque arranca en 55 %: con paro en 60 %, el control decide en segundos.
    await page.getByRole("slider", { name: /^Paro/ }).fill("60");
    await show(page, info, "Planta");
    await page.getByRole("button", { name: "Conectar con la ruta sugerida" }).click();
    await expect(log(page)).toContainText(/Nivel alto \(\d+ %\): P-101 detenida por control/, {
      timeout: 15_000,
    });
    await expect(pumpState(page)).toHaveText("En espera por nivel");
  });

  test("en manual, el operador arranca y detiene; tocar la bomba en el diagrama también", async ({
    page,
  }, info) => {
    await openDemo(page);
    await page.getByRole("button", { name: "Conectar con la ruta sugerida" }).click();
    await expect(pumpState(page)).toHaveText("En marcha");

    await show(page, info, "Mando");
    await page.getByRole("button", { name: "Manual" }).click();
    await page.getByRole("button", { name: "Detener" }).click();
    await expect(pumpState(page)).toHaveText("Detenida");

    await show(page, info, "Planta");
    const { layout, at } = await canvas(page, info);
    const motor = layout === "h" ? at(370, 320) : at(170, 470);
    if (info.project.use.hasTouch) await page.touchscreen.tap(...motor);
    else await page.mouse.click(...motor);
    await expect(pumpState(page)).toHaveText("En marcha");
  });

  test("las alarmas se reconocen y siguen contando mientras estén activas", async ({ page }, info) => {
    await openDemo(page);
    await expect(page.getByText("1 alarma")).toBeVisible();
    await show(page, info, "Alarmas");
    await page.getByRole("button", { name: "Reconocer" }).click();
    await expect(log(page)).toContainText("Reconocida");
    await expect(page.getByText("1 alarma")).toBeVisible();
  });

  test("móvil: la app muestra una vista a la vez", async ({ page }, info) => {
    test.skip(isDesktop(info), "en desktop todas las vistas están a la vista");
    await openDemo(page);
    const diagram = page.locator('#proceso svg[data-layout="v"]');
    await expect(diagram).toBeVisible();
    await show(page, info, "Alarmas");
    await expect(diagram).toBeHidden();
    await expect(page.getByRole("heading", { name: "Alarmas y eventos" })).toBeVisible();
  });

  test("desktop: se conecta arrastrando de puerto a puerto y la ruta aterriza exacta", async ({
    page,
  }, info) => {
    test.skip(
      !isDesktop(info),
      "el arrastre con mouse es de desktop; en táctil se verifica con la ruta sugerida",
    );
    await openDemo(page);
    const { at } = await canvas(page, info);
    await page.mouse.move(...at(690, 200));
    await page.mouse.down();
    for (const [x, y] of [
      [720, 196],
      [770, 160],
      [790, 120],
      [820, 96],
      [842, 90],
    ] as const)
      await page.mouse.move(...at(x, y), { steps: 4 });
    await page.mouse.up();
    await expect(page.getByRole("button", { name: "Operación" })).toHaveAttribute("aria-pressed", "true");
    // El cabezal trae dos codos y la Z conectada, dos más.
    await expect(log(page)).toContainText(/Línea conectada: \d+ m, 4 codos/);
  });

  test("desktop: la palanca de la válvula se arrastra y se toca", async ({ page }, info) => {
    test.skip(!isDesktop(info), "el arrastre con mouse es de desktop; en táctil queda el deslizador");
    await openDemo(page);
    const { at } = await canvas(page, info);
    const slider = page.getByRole("slider", { name: /Válvula XV-101/ });
    // Pivote de la palanca, arriba del cuerpo de la válvula.
    const [x, y] = at(610, 176);

    // A 45°, entre abierta (a lo largo del tubo) y cerrada (atravesada): media apertura.
    await page.mouse.move(x + 30, y);
    await page.mouse.down();
    await page.mouse.move(x + 26, y - 26, { steps: 6 });
    await page.mouse.up();
    await expect(slider).toHaveValue("50");

    // Un toque sin arrastre la lleva al extremo contrario: de media a abierta, y de abierta a cerrada.
    await page.mouse.click(x + 20, y - 20);
    await expect(slider).toHaveValue("100");
    await page.mouse.click(x + 20, y);
    await expect(slider).toHaveValue("0");
  });
});
