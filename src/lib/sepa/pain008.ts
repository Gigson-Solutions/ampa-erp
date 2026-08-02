// Generador de remesas SEPA (pain.008.001.02) — placeholder de Fase 0.
// Implementación real en Fase 1: construir el XML por AMPA usando su propio
// `sepaCreditorId`/`sepaIban` (campos ya presentes en el modelo `Ampa`), validar
// contra el XSD oficial antes de subir el fichero a un banco (ver plan de visión,
// sección "Verificación").

import type { SepaMandate } from "./mandate";

export interface Pain008Input {
  ampaCreditorId: string;
  ampaCreditorName: string;
  ampaIban: string;
  mandates: SepaMandate[];
}

export function generatePain008Xml(): string {
  throw new Error("generatePain008Xml: pendiente de implementar en Fase 1 (ver STRATEGY/roadmap).");
}
