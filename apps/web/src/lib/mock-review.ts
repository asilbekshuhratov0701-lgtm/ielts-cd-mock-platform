import {
  scoreImportedExam,
  type CandidateAnswer,
  type ImportAnswerKey
} from "@ielts/core";
import type { PreviewExam } from "@/lib/exam-import-map";

export interface AnswerRow {
  number: string;
  sort: number;
  candidate: string;
  accepted: string;
  correct: boolean;
}

type EngineGroup = {
  inputKind: string;
  id: string;
  numberRange?: [number, number];
  questions?: { id: string; number: number }[];
  rows?: { id: string; number: number }[];
  gaps?: { id: string; number: number }[];
  prompts?: { id: string; number: number }[];
};

function labelMap(engine: PreviewExam): Map<string, { label: string; sort: number }> {
  const map = new Map<string, { label: string; sort: number }>();
  for (const section of engine.sections ?? []) {
    for (const g of (section.groups ?? []) as unknown as EngineGroup[]) {
      if (g.inputKind === "radio") {
        for (const q of g.questions ?? []) map.set(q.id, { label: String(q.number), sort: q.number });
        for (const r of g.rows ?? []) map.set(r.id, { label: String(r.number), sort: r.number });
      } else if (g.inputKind === "gap") {
        for (const gap of g.gaps ?? []) map.set(gap.id, { label: String(gap.number), sort: gap.number });
      } else if (g.inputKind === "select") {
        for (const p of g.prompts ?? []) map.set(p.id, { label: String(p.number), sort: p.number });
      } else if (g.inputKind === "checkbox") {
        const [from, to] = g.numberRange ?? [0, 0];
        map.set(g.id, { label: from === to ? String(from) : `${from}–${to}`, sort: from });
      }
    }
  }
  return map;
}

function fmt(value: CandidateAnswer): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  return value.trim() === "" ? "—" : value;
}

export function buildAnswerRows(
  engine: PreviewExam,
  answerKey: Record<string, ImportAnswerKey>,
  answers: Record<string, CandidateAnswer>
): AnswerRow[] {
  const labels = labelMap(engine);
  const score = scoreImportedExam(answerKey, answers ?? {});
  const byId = new Map(score.perQuestion.map((q) => [q.questionId, q]));
  const rows: AnswerRow[] = Object.entries(answerKey).map(([qid, key]) => {
    const lbl = labels.get(qid) ?? { label: qid, sort: 9999 };
    return {
      number: lbl.label,
      sort: lbl.sort,
      candidate: fmt(answers?.[qid]),
      accepted: key.accepted.join("  /  "),
      correct: byId.get(qid)?.correct ?? false
    };
  });
  return rows.sort((a, b) => a.sort - b.sort);
}
