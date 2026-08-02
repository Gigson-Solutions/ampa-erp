import { createHash } from "node:crypto";

// RGPD de menores (ver CLAUDE.md > Roadmap Fase 1): consentimientos versionados con
// evidencia de firma (IP + timestamp + hash). Subir `CONSENT_VERSION` cada vez que
// cambie el texto legal que se le muestra a la familia — los consentimientos ya
// firmados quedan congelados con la versión que aceptaron en su momento.
export const CONSENT_VERSION = "2026-08-v1";

export type ConsentType = "DATA" | "IMAGE" | "CENTER_SHARE";

export interface ConsentEvidenceInput {
  type: ConsentType;
  accepted: boolean;
  ip: string;
  timestamp: Date;
}

export interface ConsentEvidence {
  type: ConsentType;
  version: string;
  accepted: boolean;
  ip: string;
  hash: string;
  acceptedAt: Date;
}

/**
 * Genera la evidencia de firma de un consentimiento: un hash determinista de
 * (tipo + versión + aceptado + ip + timestamp) que sirve como prueba documental de
 * qué se aceptó, cuándo y desde dónde — sin necesidad de guardar más metadatos.
 */
export function buildConsentEvidence(input: ConsentEvidenceInput): ConsentEvidence {
  const { type, accepted, ip, timestamp } = input;
  const payload = `${type}|${CONSENT_VERSION}|${accepted}|${ip}|${timestamp.toISOString()}`;
  const hash = createHash("sha256").update(payload).digest("hex");

  return {
    type,
    version: CONSENT_VERSION,
    accepted,
    ip,
    hash,
    acceptedAt: timestamp,
  };
}
