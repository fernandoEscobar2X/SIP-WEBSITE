import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;

/**
 * E2E sobre el export estático servido como en Netlify (scripts/serve-static.mjs), en una
 * matriz de dispositivos reales:
 * - desktop: Chrome y Edge instalados, y Safari (WebKit de Playwright);
 * - iPhone y iPad con WebKit: en iOS todos los navegadores usan el motor de Safari;
 * - Android con Chrome, en la pantalla más angosta de la matriz (360 px).
 * `metadata.form` dice a las pruebas qué experiencia esperar (desktop, phone, tablet).
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && node scripts/serve-static.mjs ${PORT}`,
    url: `http://localhost:${PORT}/es`,
    // Siempre build + servidor propios: nunca validar contra un build viejo.
    reuseExistingServer: false,
    timeout: 240_000,
    env: { NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` },
  },
  projects: [
    {
      name: "desktop-chrome",
      metadata: { form: "desktop" },
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "desktop-edge",
      metadata: { form: "desktop" },
      use: { ...devices["Desktop Edge"], channel: "msedge", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "desktop-safari",
      metadata: { form: "desktop" },
      use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } },
    },
    { name: "iphone", metadata: { form: "phone" }, use: { ...devices["iPhone 17"] } },
    { name: "ipad", metadata: { form: "tablet" }, use: { ...devices["iPad (gen 11)"] } },
    { name: "android", metadata: { form: "phone" }, use: { ...devices["Galaxy S24"], channel: "chrome" } },
  ],
});
