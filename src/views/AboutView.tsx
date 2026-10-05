import { AboutIntro } from "@/features/about/AboutIntro";
import { AboutWho } from "@/features/about/AboutWho";
import { Commitments } from "@/features/about/Commitments";
import { VisionMission } from "@/features/about/VisionMission";
import { ContactSection } from "@/features/contact/ContactSection";

/**
 * Nosotros: apertura desde el Pacífico → quiénes somos → visión y misión → compromisos → contacto.
 * No repite el manifiesto de la home (qué conectamos y qué entregamos): cuenta quiénes son, a dónde
 * van y qué prometen. Superficies alternadas: noche, hielo, noche, hielo, blanco.
 */
export function AboutView() {
  return (
    <>
      <AboutIntro />
      <AboutWho />
      <VisionMission />
      <Commitments />
      <ContactSection />
    </>
  );
}
