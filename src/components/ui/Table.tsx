import { clsx } from "clsx";
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

// Envoltorio de tabla con el estilo del design kit: cabecera en mayúsculas/gris,
// filas separadas por un borde inferior sutil, radio 8px en el contenedor.

export function Table({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }): React.ReactElement {
  return <thead className="border-b border-border bg-page">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }): React.ReactElement {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TR({ children }: { children: ReactNode }): React.ReactElement {
  return <tr>{children}</tr>;
}

export function TH({ children, className, ...props }: ThHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return (
    <th
      className={clsx("px-4 py-3 text-xs font-semibold tracking-wide text-ink-400 uppercase", className)}
      {...props}
    >
      {children}
    </th>
  );
}

export function TD({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return (
    <td className={clsx("px-4 py-3 text-ink-900", className)} {...props}>
      {children}
    </td>
  );
}
