import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export function PageShell({
  title,
  subtitle,
  actions,
  children
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div className="space-y-5">{children}</div>
    </main>
  );
}

export function StubNotice({ feature }: { feature: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-5 text-sm text-muted">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
      <span>
        <strong className="font-medium text-brand-700">{feature}</strong> — coming soon.
        Implementation pending (see <code className="text-brand-700">/docs</code>).
      </span>
    </div>
  );
}
