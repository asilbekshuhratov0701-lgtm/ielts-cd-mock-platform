import { PenLine } from "lucide-react";
import { Card } from "@/components/ui/card";

export type WritingCriteria = {
  taskResponse: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammaticalRange: number;
};

export type WritingTaskDetail = {
  taskNumber: number;
  taskBand: number;
  criteria: WritingCriteria;
};

const CRIT: { label: string; k: keyof WritingCriteria }[] = [
  { label: "Task Response", k: "taskResponse" },
  { label: "Coherence & Cohesion", k: "coherenceCohesion" },
  { label: "Lexical Resource", k: "lexicalResource" },
  { label: "Grammatical Range", k: "grammaticalRange" }
];

export function WritingTaskGrid({ tasks }: { tasks: WritingTaskDetail[] }) {
  return (
    <div className="space-y-3">
      {tasks.map((t) => (
        <div key={t.taskNumber}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Task {t.taskNumber}</span>
            <span className="text-muted">band {t.taskBand.toFixed(1)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CRIT.map((c) => (
              <div key={c.k} className="rounded-md bg-brand-50/50 px-2 py-1.5 text-center">
                <div className="text-[11px] leading-tight text-muted">{c.label}</div>
                <div className="mt-0.5 text-sm font-semibold text-foreground">
                  {t.criteria[c.k].toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ExaminerFeedback({ items }: { items: { label?: string; text: string }[] }) {
  if (items.length === 0) return null;
  return (
    <Card className="mt-5 p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <PenLine className="h-4 w-4 text-brand-600" /> Examiner feedback
      </h2>
      <div className="space-y-4">
        {items.map((it, i) => (
          <div key={i}>
            {it.label ? (
              <div className="mb-1 text-xs font-medium capitalize text-muted">{it.label}</div>
            ) : null}
            <p className="whitespace-pre-wrap rounded-lg bg-brand-50/40 p-3 text-sm leading-relaxed text-foreground/90">
              {it.text}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
