import { cn } from "@/lib/cn";
import { HelpPopover } from "./HelpPopover";
import type { BaseGroup } from "./types";

export function NumberBadge({ n, boxed }: { n: number; boxed?: boolean }) {
  if (boxed) {
    return (
      <span className="mr-2 inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-brand-400 px-1 text-sm font-semibold text-brand-700">
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
  const range = from === to ? `Question ${from}` : `Questions ${from} - ${to}`;
  return (
    <section>
      <div className="mb-1 flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">{range}</h2>
        <HelpPopover text={group.helpText} />
      </div>
      {group.instructions ? (
        <p className="mb-3 text-base italic text-foreground/70">{group.instructions}</p>
      ) : null}
      <div className={cn("rounded-md bg-black/[0.04] p-5")} data-hl data-hl-id={group.id}>
        {group.title ? (
          <h3 className="mb-4 text-center text-base font-semibold text-foreground">{group.title}</h3>
        ) : null}
        {children}
      </div>
    </section>
  );
}
