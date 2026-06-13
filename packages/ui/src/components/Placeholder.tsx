import type { ReactNode } from "react";

/**
 * Minimal placeholder component validating the shared UI toolchain (React 19 + JSX).
 * Real shadcn/Radix primitives (Button, Card, Dialog, DataTable, ...) land here during
 * implementation and are re-exported from the package index.
 */
export interface PlaceholderProps {
  title: string;
  children?: ReactNode;
}

export function Placeholder({ title, children }: PlaceholderProps) {
  return (
    <section className="rounded-2xl border border-brand-100 bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-brand-700">{title}</h2>
      {children ? <div className="mt-2 text-sm text-foreground/70">{children}</div> : null}
    </section>
  );
}
