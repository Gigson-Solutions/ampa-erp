// Mandatos SEPA (FRST/RCUR) — placeholder de Fase 0. Implementación real en Fase 1
// (ver roadmap): generación de mandato con firma electrónica simple, secuencia
// FRST (primer cobro) → RCUR (recurrentes), y su relación con el `sepaCreditorId`
// propio de cada `Ampa` (decisión confirmada: cada AMPA tramita el suyo, no hay
// acreedor centralizado).

export type SepaSequenceType = "FRST" | "RCUR" | "FNAL" | "OOFF";

export interface SepaMandate {
  mandateId: string;
  ampaId: string;
  debtorName: string;
  debtorIban: string;
  signedAt: Date;
  sequenceType: SepaSequenceType;
}

export function createMandate(): SepaMandate {
  throw new Error("createMandate: pendiente de implementar en Fase 1 (ver STRATEGY/roadmap).");
}
