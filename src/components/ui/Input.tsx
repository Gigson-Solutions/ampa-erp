import { clsx } from "clsx";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// Misma altura/radio que Button (h-10, r=4) para que inputs y botones alineen
// visualmente en la misma fila, con foco en color de marca.
const FIELD_CLASSES =
  "h-10 w-full rounded border border-border bg-surface px-3 text-sm text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): React.ReactElement {
  return <input className={clsx(FIELD_CLASSES, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>): React.ReactElement {
  return <select className={clsx(FIELD_CLASSES, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>): React.ReactElement {
  return (
    <textarea
      className={clsx(FIELD_CLASSES, "h-auto min-h-24 py-2", className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>): React.ReactElement {
  return <label className={clsx("mb-1 block text-sm font-medium text-ink-900", className)} {...props} />;
}

export function FormField({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return <div className={clsx("flex flex-col", className)}>{children}</div>;
}
