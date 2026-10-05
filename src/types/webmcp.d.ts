/**
 * WebMCP declarativo (Chrome 149+, origin trial): un formulario se expone a los agentes como
 * herramienta. Lighthouse 13 lo audita en la categoría Agentic Browsing.
 */
import "react";

declare module "react" {
  interface FormHTMLAttributes<T> {
    /** Nombre de la herramienta que ven los agentes. */
    toolname?: string;
    tooldescription?: string;
    /** Si está presente, el agente puede enviar sin confirmación de la persona. */
    toolautosubmit?: boolean;
  }
  interface InputHTMLAttributes<T> {
    toolparamdescription?: string;
  }
  interface SelectHTMLAttributes<T> {
    toolparamdescription?: string;
  }
  interface TextareaHTMLAttributes<T> {
    toolparamdescription?: string;
  }
}

declare global {
  interface SubmitEvent {
    /** true cuando el envío lo hizo un agente a través de WebMCP. */
    readonly agentInvoked?: boolean;
    /** Resultado que recibe el agente (en lugar de la navegación del envío). */
    respondWith?(result: Promise<unknown>): void;
  }
}
