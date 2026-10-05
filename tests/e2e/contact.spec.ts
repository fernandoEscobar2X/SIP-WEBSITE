import { expect, test } from "@playwright/test";
import { isDesktop } from "./form";

test.describe("contacto", () => {
  test("publica el correo de Humberto en ambos idiomas", async ({ page }) => {
    for (const path of ["/es/contacto", "/en/contact"]) {
      await page.goto(path);
      await expect(page.locator('#contacto a[href="mailto:humberto@sipintegrales.com"]')).toBeVisible();
      await expect(page.getByText("sistemas@sipintegrales.com", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Copiar correo|Copy email/ })).toHaveCount(0);
      await expect(page.getByText(/Hora en Tijuana|Time in Tijuana/)).toHaveCount(0);
    }
  });

  test("muestra un fallo real del envío y permite reintentar", async ({ page }) => {
    await page.route("**/__forms.html", (route) => route.fulfill({ status: 503, body: "" }));
    await page.goto("/es/contacto");
    const form = page.getByRole("form", { name: "Formulario de contacto" });
    await form.getByLabel("Nombre").fill("Ana Prueba");
    await form.getByLabel("Correo").fill("ana@example.com");
    await form.getByLabel("¿Qué pasa en tu operación?").fill("Queremos conocer sus servicios.");
    await form.getByRole("button", { name: "Enviar mensaje" }).click();
    await expect(form.getByRole("status")).toHaveText(/humberto@sipintegrales\.com/);
    await expect(form.getByRole("button", { name: "Enviar mensaje" })).toBeEnabled();
  });
  test("valida en el idioma del visitante y lleva el foco al primer error", async ({ page }) => {
    await page.goto("/es/contacto");
    const form = page.getByRole("form", { name: "Formulario de contacto" });
    await form.getByRole("button", { name: "Enviar mensaje" }).click();
    await expect(form.getByLabel("Nombre")).toBeFocused();
    await expect(form.getByLabel("Nombre")).toHaveAttribute("aria-invalid", "true");
    await expect(form.getByText("Este campo es necesario.").first()).toBeVisible();
    await expect(form.getByText("Revisa los campos marcados.")).toBeVisible();
  });

  test("envía a Netlify Forms y confirma sin recargar", async ({ page }) => {
    let body = "";
    await page.route("**/__forms.html", async (route) => {
      body = route.request().postData() ?? "";
      await route.fulfill({ status: 200, body: "" });
    });
    await page.goto("/en/contact");
    const form = page.getByRole("form", { name: "Contact form" });
    await form.getByLabel("Name").fill("Ana López");
    await form.getByLabel("Email").fill("ana@empresa.mx");
    await form.getByLabel("What is happening in your operation?").fill("We track line stops on paper.");
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status").filter({ hasText: "We got your message." })).toBeFocused();
    const sent = new URLSearchParams(body);
    expect(sent.get("form-name")).toBe("contacto");
    expect(sent.get("correo")).toBe("ana@empresa.mx");
    expect(sent.get("idioma")).toBe("en");
    expect(sent.get("sitio-web")).toBe("");
  });

  test("tras un envío con errores, corregir y volver a enviar funciona con un solo clic", async ({
    page,
  }) => {
    await page.route("**/__forms.html", (route) => route.fulfill({ status: 200, body: "" }));
    await page.goto("/es/contacto");
    const form = page.getByRole("form", { name: "Formulario de contacto" });
    const submit = form.getByRole("button", { name: "Enviar mensaje" });
    await submit.click();
    await expect(form.getByText("Este campo es necesario.").first()).toBeVisible();
    await form.getByLabel("Nombre").fill("Ana López");
    await form.getByLabel("Correo").fill("ana@empresa.mx");
    // El último campo con error sigue enfocado al dar clic: su mensaje no debe mover el botón.
    await form.getByLabel("¿Qué pasa en tu operación?").fill("Registramos los paros en papel.");
    await expect(form.getByText("Este campo es necesario.")).toHaveCount(0);
    await submit.click();
    await expect(page.getByRole("status").filter({ hasText: "Recibimos tu mensaje." })).toBeVisible();
  });

  test("se declara como herramienta para agentes (WebMCP)", async ({ page }) => {
    await page.goto("/es/contacto");
    const form = page.locator('form[toolname="contactar_sip"]');
    await expect(form).toHaveAttribute("tooldescription", /SIP/);
    for (const field of ["nombre", "correo", "mensaje"]) {
      await expect(form.locator(`[name="${field}"]`)).toHaveAttribute("toolparamdescription", /.+/);
    }
  });

  test("el CTA del hero lleva al formulario de la misma página", async ({ page }) => {
    await page.goto("/es");
    await page.getByRole("link", { name: "Platiquemos tu proyecto" }).first().click();
    await expect(page).toHaveURL(/\/es(#contacto)?$/);
    await expect(page.getByRole("heading", { name: "Hagamos grande tu idea." })).toBeInViewport();
  });
});

test("el manifiesto presenta la placa de datos de SIP", async ({ page }, info) => {
  test.skip(!isDesktop(info), "en móvil y tableta el manifiesto conserva su diseño sin placa");
  await page.goto("/es");
  const plate = page.locator('dl[aria-label="Ficha de SIP"]');
  await plate.scrollIntoViewIfNeeded();
  for (const label of ["Desde", "Industrias", "Conectamos", "Entregamos"]) {
    await expect(plate.getByText(label, { exact: true })).toBeVisible();
  }
});
