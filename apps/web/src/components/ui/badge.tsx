import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "brand" | "success" | "warning" | "muted" | "danger";

const VARIANTS: Record<Variant, string> = {
  default: "bg-brand-50 text-brand-700",
  brand: "bg-brand-600 text-white",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  muted: "bg-foreground/5 text-muted",
  danger: "bg-red-100 text-red-700"
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
