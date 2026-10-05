import { describe, expect, it } from "vitest";
import { CONTACT_FORM_NAME, type ContactField, toNetlifyBody, validateContact } from "./schema";

const valid: Record<ContactField, string> = {
  nombre: "Ana López",
  empresa: "Maquila del Norte",
  correo: "ana@example.com",
  telefono: "+52 664 000 0000",
  industria: "manufactura",
  mensaje: "Queremos ver los paros de la línea 3 en tiempo real.",
};

describe("formulario de contacto", () => {
  it("acepta un mensaje completo y limpia espacios", () => {
    const result = validateContact({ ...valid, nombre: "  Ana López " });
    expect(result.ok && result.data.nombre).toBe("Ana López");
  });

  it("empresa, teléfono e industria son opcionales", () => {
    expect(validateContact({ ...valid, empresa: "", telefono: "", industria: "" }).ok).toBe(true);
  });

  it("devuelve un código por campo, el primero que falla", () => {
    const result = validateContact({
      ...valid,
      nombre: "",
      correo: "ana@",
      mensaje: "Hola",
      telefono: "abc",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual({
        nombre: "required",
        correo: "email",
        mensaje: "tooShort",
        telefono: "phone",
      });
    }
  });

  it("rechaza industrias que no existen", () => {
    expect(validateContact({ ...valid, industria: "mineria" }).ok).toBe(false);
  });

  it("arma el cuerpo que espera Netlify Forms, con el campo trampa vacío", () => {
    const result = validateContact(valid);
    if (!result.ok) throw new Error("debería ser válido");
    const body = new URLSearchParams(toNetlifyBody(result.data, "es"));
    expect(body.get("form-name")).toBe(CONTACT_FORM_NAME);
    expect(body.get("sitio-web")).toBe("");
    expect(body.get("correo")).toBe("ana@example.com");
    expect(body.get("idioma")).toBe("es");
  });
});
