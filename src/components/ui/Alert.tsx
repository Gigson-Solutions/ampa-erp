import { clsx } from "clsx";
import type { ReactNode } from "react";

export interface AlertProps {
  variant: "success" | "error";
  children: ReactNode;
}

// Mensajes de éxito/error de formularios — reutiliza los mismos tokens de color
// que Badge, pero a ancho completo con role accesible.
export function Alert({ variant, children }: AlertProps): React.ReactElement {
  return (
    <p
      role={variant === "error" ? "alert" : "status"}
      className={clsx(
        "rounded px-3 py-2 text-sm",
        variant === "success" && "bg-success-bg text-success-fg",
        variant === "error" && "bg-danger-bg text-danger-fg",
      )}
    >
      {children}
    </p>
  );
}
