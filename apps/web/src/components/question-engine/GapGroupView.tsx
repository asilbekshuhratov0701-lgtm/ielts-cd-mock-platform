"use client";

import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAnswer } from "./answers-store";
import { GapInput, wordLimitPhrase } from "./primitives";
import type {
  FlowchartContent,
  FormContent,
  Gap,
  GapGroup,
  NoteContent,
  SentenceContent,
  SummaryContent,
  TableContent
} from "./types";

function GapSlot({ gap }: { gap: Gap }) {
  const [value, set] = useAnswer(gap.id);
  return (
    <GapInput
      number={gap.number}
      value={(value as string) ?? ""}
      onChange={set}
      wordLimit={gap.wordLimit}
      allowNumber={gap.allowNumber}
    />
  );
}

function renderText(text: string, byNumber: Map<number, Gap>): React.ReactNode[] {
  return text.split(/(\{\{\d+\}\})/g).map((part, i) => {
    const m = part.match(/^\{\{(\d+)\}\}$/);
    if (m) {
      const gap = byNumber.get(Number(m[1]));
      if (gap) return <GapSlot key={i} gap={gap} />;
      return (
        <span key={i} className="text-muted">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function NoteLayout({ content, byNumber }: { content: NoteContent; byNumber: Map<number, Gap> }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      {content.title ? (
        <p className="mb-3 text-center text-base font-semibold text-foreground">{content.title}</p>
      ) : null}
      <div className="space-y-4">
        {content.sections.map((section, s) => (
          <div key={s}>
            {section.heading ? (
              <p className="mb-1.5 text-base font-bold text-foreground">{section.heading}</p>
            ) : null}
            <ul className="space-y-1.5">
              {section.items.map((raw, i) => {
                const item = typeof raw === "string" ? { text: raw, sub: false, plain: false } : raw;
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex gap-2 text-base leading-relaxed text-foreground",
                      item.sub && "ml-5"
                    )}
                  >
                    {item.plain ? null : (
                      <span className="select-none text-muted">{item.sub ? "–" : "•"}</span>
                    )}
                    <span>{renderText(item.text, byNumber)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryLayout({
  content,
  byNumber
}: {
  content: SummaryContent;
  byNumber: Map<number, Gap>;
}) {
  return (
    <div>
      {content.title ? (
        <p className="mb-3 text-center text-base font-semibold text-foreground">{content.title}</p>
      ) : null}
      <div className="space-y-3">
        {content.paragraphs.map((p, i) => (
          <p key={i} className="text-base leading-loose text-foreground">
            {renderText(p, byNumber)}
          </p>
        ))}
      </div>
    </div>
  );
}

function TableLayout({ content, byNumber }: { content: TableContent; byNumber: Map<number, Gap> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-base">
        <tbody>
          {content.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => {
                const header = content.headerRow && r === 0;
                const Tag = header ? "th" : "td";
                return (
                  <Tag
                    key={c}
                    className={cn(
                      "border border-border px-3 py-2 align-middle leading-relaxed",
                      header
                        ? "bg-brand-50 text-left font-semibold text-brand-700"
                        : "text-foreground"
                    )}
                  >
                    {renderText(cell, byNumber)}
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormLayout({ content, byNumber }: { content: FormContent; byNumber: Map<number, Gap> }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border">
      {content.rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-base">
          <span className="min-w-32 font-medium text-muted">{row.label}</span>
          <span className="text-foreground">{renderText(row.value, byNumber)}</span>
        </div>
      ))}
    </div>
  );
}

function FlowchartLayout({
  content,
  byNumber
}: {
  content: FlowchartContent;
  byNumber: Map<number, Gap>;
}) {
  return (
    <div>
      {content.nodes.map((node, i) => (
        <div key={node.id} className="flex flex-col items-center">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface px-4 py-3 text-center text-base leading-relaxed text-foreground">
            {renderText(node.text, byNumber)}
          </div>
          {i < content.nodes.length - 1 ? (
            <ArrowDown className="my-1 h-4 w-4 shrink-0 text-muted" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SentenceLayout({
  content,
  byNumber
}: {
  content: SentenceContent;
  byNumber: Map<number, Gap>;
}) {
  return (
    <div className="flex flex-col gap-[var(--space-question)]">
      {content.sentences.map((sentence, i) => (
        <p key={i} className="text-base leading-loose text-foreground">
          {renderText(sentence, byNumber)}
        </p>
      ))}
    </div>
  );
}

function ImageLayout({ group, byNumber }: { group: GapGroup; byNumber: Map<number, Gap> }) {
  const content = (group.content ?? {}) as { items?: string[] };
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="overflow-hidden rounded-xl border border-border bg-foreground/[0.02]">
        {group.imageUrl ? (
          <img src={group.imageUrl} alt="Labelling diagram" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-48 items-center justify-center text-xs text-muted">
            (static image — labels printed on it)
          </div>
        )}
      </div>
      <div className="flex flex-col gap-[var(--space-question)]">
        {content.items
          ? content.items.map((item, i) => (
              <p key={i} className="text-base leading-relaxed text-foreground">
                {renderText(item, byNumber)}
              </p>
            ))
          : group.gaps.map((gap) => (
              <p key={gap.id} className="flex items-center gap-2 text-base text-foreground">
                <span className="font-bold">{gap.number}.</span>
                <GapSlot gap={gap} />
              </p>
            ))}
      </div>
    </div>
  );
}

function GapLayoutBody({ group, byNumber }: { group: GapGroup; byNumber: Map<number, Gap> }) {
  switch (group.layout) {
    case "note":
      return <NoteLayout content={group.content as NoteContent} byNumber={byNumber} />;
    case "summary":
      return <SummaryLayout content={group.content as SummaryContent} byNumber={byNumber} />;
    case "table":
      return <TableLayout content={group.content as TableContent} byNumber={byNumber} />;
    case "form":
      return <FormLayout content={group.content as FormContent} byNumber={byNumber} />;
    case "flowchart":
      return <FlowchartLayout content={group.content as FlowchartContent} byNumber={byNumber} />;
    case "sentence":
      return <SentenceLayout content={group.content as SentenceContent} byNumber={byNumber} />;
    case "image":
      return <ImageLayout group={group} byNumber={byNumber} />;
  }
}

export function GapGroupView({ group }: { group: GapGroup }) {
  const byNumber = new Map(group.gaps.map((g) => [g.number, g] as const));
  const first = group.gaps[0];
  const wordLimit = first?.wordLimit ?? 0;
  return (
    <div>
      {wordLimit > 0 ? (
        <p className="mb-2 inline-block rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Write {wordLimitPhrase(wordLimit, first?.allowNumber ?? true)}
        </p>
      ) : null}
      <GapLayoutBody group={group} byNumber={byNumber} />
    </div>
  );
}
