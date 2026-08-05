import { clsx } from "clsx";
import type { ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  className?: string;
}

// Tarjeta blanca con radio 8px, tal como las tarjetas de widgets del Dashboard
// del design kit (fondo de página #f7f9fb + tarjetas blancas r=8).
export function Card({ children, className }: CardProps): React.ReactElement {
  return <div className={clsx("rounded-lg bg-surface p-6 shadow-sm", className)}>{children}</div>;
}
