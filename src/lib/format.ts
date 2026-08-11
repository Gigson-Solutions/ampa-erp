// Formato de importes consistente en toda la app. Antes cada pantalla concatenaba
// `${amount}€` a pelo, lo que producía resultados inconsistentes: "90€" (sin
// decimales), "75.17€" (punto en vez de coma), etc. `Intl.NumberFormat` con
// locale "es-ES" siempre da el mismo formato ("90,00 €", "75,17 €"), igual que ya
// se hace con las fechas (`toLocaleDateString("es-ES")`) en las mismas tablas.
const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}
