import { expect, test } from "@playwright/test";

const PAGES = ["/es", "/en/about", "/es/servicios", "/es/contacto", "/en/does-not-exist"];

test.describe("seguridad", () => {
  test("cada respuesta lleva las cabeceras de producción", async ({ request }) => {
    for (const path of PAGES) {
      const response = await request.get(path);
      const headers = response.headers();
      expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
      expect(headers["x-frame-options"], path).toBe("DENY");
      expect(headers["x-content-type-options"], path).toBe("nosniff");
      expect(headers["strict-transport-security"], path).toContain("max-age=");
    }
  });

  test("la CSP no bloquea nada del sitio", async ({ page }) => {
    const violations: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && /Content Security Policy|Permissions-Policy/i.test(message.text())) {
        violations.push(message.text());
      }
    });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        console.error(`Content Security Policy: ${event.violatedDirective} ${event.blockedURI}`);
      });
    });
    for (const path of PAGES) {
      await page.goto(path);
      // Recorre la página para que carguen las piezas diferidas (microdemo, imágenes, SplitText).
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.8) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      });
      await page.waitForLoadState("networkidle");
    }
    expect(violations).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("la raíz lleva al idioma del navegador", async ({ browser }) => {
    for (const [locale, expected] of [
      ["es-MX", /\/es$/],
      ["en-US", /\/en$/],
      ["fr-FR", /\/es$/],
    ] as const) {
      const context = await browser.newContext({ locale });
      const page = await context.newPage();
      await page.goto("/");
      await expect(page).toHaveURL(expected);
      await context.close();
    }
  });
});
