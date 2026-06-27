import { cn } from "@/lib/cn";
import { HelpPopover } from "./HelpPopover";
import type { BaseGroup } from "./types";

export function NumberBadge({ n, boxed }: { n: number; boxed?: boolean }) {
  if (boxed) {
    return (
      <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-brand-400 px-1 text-xs font-semibold text-brand-700">
        {n}
      </span>
    );
  }
  return <span className="mr-2 font-bold text-foreground">{n}.</span>;
}

export function QuestionGroupFrame({
  group,
  children
}: {
  group: BaseGroup;
  children: React.ReactNode;
}) {
  const [from, to] = group.numberRange;
  const range = from === to ? `Question ${from}` : `Questions ${from}–${to}`;
  return (
    <section>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">{range}</h2>
        <HelpPopover text={group.helpText} />
      </div>
      <p className="mb-3 text-sm text-muted">{group.instructions}</p>
      <div className={cn("rounded-2xl border border-border bg-foreground/[0.02] p-5")}>
        {group.title ? (
          <h3 className="mb-4 text-center text-base font-semibold text-foreground">{group.title}</h3>
        ) : null}
        {children}
      </div>
    </section>
  );
}
