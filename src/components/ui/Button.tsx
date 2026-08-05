import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type ButtonSize = "xs" | "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// Estilos extraídos del design kit (componente "_Button/Base"): radio 4px,
// sombra sutil 0 1px 1px rgba(0,0,0,.12), tres tipos, tres tamaños.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-sm",
  secondary: "bg-surface text-ink-900 border border-border hover:bg-page shadow-sm",
  tertiary: "bg-transparent text-ink-900 hover:bg-page",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "h-7 px-3 text-xs gap-1.5",
  sm: "h-8 px-3 text-sm gap-2",
  md: "h-10 px-4 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "sm",
  className,
  ...props
}: ButtonProps): React.ReactElement {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
