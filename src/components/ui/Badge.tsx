import { clsx } from "clsx";
import type { ReactNode } from "react";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

export interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
}

// Pares fondo-claro/texto-oscuro extraídos del componente "Order Status" del
// design kit (6 variantes de estado, radio 4px).
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-danger-bg text-danger-fg",
  info: "bg-info-bg text-info-fg",
  neutral: "bg-neutral-bg text-neutral-fg",
};

export function Badge({ variant, children }: BadgeProps): React.ReactElement {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-2 py-1 text-xs font-semibold whitespace-nowrap",
        VARIANT_CLASSES[variant],
      )}
    >
      {children}
    </span>
  );
}
