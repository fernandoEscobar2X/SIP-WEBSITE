import { ContactSection } from "@/features/contact/ContactSection";
import { Hero } from "@/features/hero/Hero";
import { Manifesto } from "@/features/manifesto/Manifesto";
import { ProcessDemo } from "@/features/process-demo/ProcessDemo";
import { IReveal } from "@/features/reveal/IReveal";
import { ServicesIndex } from "@/features/services-index/ServicesIndex";
import { SignalToDecision } from "@/features/signal-to-decision/SignalToDecision";

/**
 * Home: hero por industria → manifiesto → "La I que se abre" → señal → dato → decisión →
 * servicios → microdemo de proceso → contacto. Corta a propósito: el detalle vive en las páginas
 * de Servicios y Nosotros. Superficies alternadas (noche, hielo, noche, hielo, blanco,
 * noche, blanco): el contenido de lectura vive en claro y el azul noche queda para los momentos.
 */
export function HomeView() {
  return (
    <>
      <Hero />
      <Manifesto />
      <IReveal />
      <SignalToDecision />
      <ServicesIndex />
      <ProcessDemo />
      <ContactSection />
    </>
  );
}
