"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { AnswersProvider, useAnswers } from "../answers-store";
import { QuestionGroupRenderer } from "../QuestionGroupRenderer";
import { LISTENING_GROUPS, READING_GROUPS } from "./fixtures";
import type { QuestionGroup } from "../types";

function StorePeek() {
  const answers = useAnswers();
  const filled = Object.values(answers).filter(
    (v) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
  ).length;
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Answers store · {filled} filled
      </p>
      <pre className="max-h-72 overflow-auto text-xs text-foreground">
        {JSON.stringify(answers, null, 2)}
      </pre>
    </div>
  );
}

function Groups({ groups }: { groups: QuestionGroup[] }) {
  return (
    <div className="flex flex-col gap-[var(--space-group)]">
      {groups.map((g) => (
        <QuestionGroupRenderer key={g.id} group={g} />
      ))}
    </div>
  );
}

export function FixturesDemo() {
  const [skill, setSkill] = useState<"listening" | "reading">("listening");
  const groups = skill === "listening" ? LISTENING_GROUPS : READING_GROUPS;
  return (
    <AnswersProvider>
      <div className="mb-5 inline-flex rounded-xl border border-border bg-surface p-1">
        {(["listening", "reading"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSkill(s)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              skill === s ? "bg-brand-600 text-white" : "text-muted hover:text-foreground"
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="grid gap-[var(--space-group)] lg:grid-cols-[1fr_20rem]">
        <Groups groups={groups} />
        <div className="lg:sticky lg:top-24 lg:self-start">
          <StorePeek />
        </div>
      </div>
    </AnswersProvider>
  );
}
