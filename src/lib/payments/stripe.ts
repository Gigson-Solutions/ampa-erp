// Stripe Connect Standard — placeholder de Fase 0. Decisión ya cerrada (ver plan de
// visión): cada AMPA tiene su propia cuenta Stripe Connect Standard, cobra
// directamente y paga sus propias comisiones — la plataforma nunca maneja dinero de
// terceros. Implementación real (onboarding de cuenta Connect, checkout con
// tarjeta + Bizum) en Fase 1.

export interface StripeAccountLink {
  ampaId: string;
  onboardingUrl: string;
}

export function createConnectOnboardingLink(): StripeAccountLink {
  throw new Error("createConnectOnboardingLink: pendiente de implementar en Fase 1.");
}
