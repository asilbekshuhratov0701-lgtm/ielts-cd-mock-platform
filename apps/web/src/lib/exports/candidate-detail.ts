import { prisma } from "@ielts/db";
import type { CandidateAnswer, ImportAnswerKey, WritingCriteria } from "@ielts/core";
import { skillBand, overallBandFrom, bandLabel } from "@/lib/mock-band";
import { buildAnswerRows, type AnswerRow } from "@/lib/mock-review";
import type { PreviewExam } from "@/lib/exam-import-map";
import { longDate } from "./group-summary";
import type { Dataset } from "./gather";

export interface DetailWritingTask {
  number: number;
  band: number | null;
  criteria: WritingCriteria | null;
}

export interface DetailSkill {
  module: string;
  label: string;
  title: string;
  band: number | null;
  raw: number | null;
  total: number | null;
  answers: AnswerRow[];
  writingTasks: DetailWritingTask[];
  feedback: string | null;
}

export interface CandidateDetail {
  brand: string;
  heading: string;
  candidate: string;
  email: string;
  groupName: string;
  mockTitle: string;
  date: string;
  generatedAt: string;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  overall: number | null;
  skills: DetailSkill[];
}

const MODULE_LABEL: Record<string, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing"
};

interface WritingResultJson {
  kind?: string;
  writingBand?: number | null;
  feedback?: string | null;
  tasks?: { taskNumber: number; taskBand: number; criteria?: WritingCriteria }[];
}

export async function gatherCandidateDetail(
  orgId: string,
  mockAttemptId: string
): Promise<CandidateDetail> {
  const attempt = await prisma.mockAttempt.findFirst({
    where: { id: mockAttemptId, mockExam: { orgId } },
    include: {
      candidate: {
        select: {
          name: true,
          email: true,
          groupMemberships: { select: { group: { select: { name: true } } } }
        }
      },
      mockExam: { select: { title: true } },
      partAttempts: { include: { blueprint: true }, orderBy: { partOrder: "asc" } }
    }
  });
  if (!attempt) throw new Error("Attempt not found");

  const skills: DetailSkill[] = attempt.partAttempts.map((part) => {
    const module = part.blueprint.module;
    const base = {
      module,
      label: MODULE_LABEL[module] ?? module,
      title: part.blueprint.title,
      answers: [] as AnswerRow[],
      writingTasks: [] as DetailWritingTask[],
      feedback: null as string | null
    };

    if (module === "writing") {
      const rj = part.resultJson as unknown as WritingResultJson | null;
      return {
        ...base,
        band: typeof rj?.writingBand === "number" ? rj.writingBand : null,
        raw: null,
        total: null,
        writingTasks: (rj?.tasks ?? []).map((t) => ({
          number: t.taskNumber,
          band: typeof t.taskBand === "number" ? t.taskBand : null,
          criteria: t.criteria ?? null
        })),
        feedback: rj?.feedback ?? null
      };
    }

    const raw = part.rawScore ?? 0;
    const total = part.totalScore ?? 0;
    const engine = part.blueprint.engineJson as unknown as PreviewExam;
    const answerKey = part.blueprint.answerKeyJson as unknown as Record<string, ImportAnswerKey>;
    const answers = (part.answersJson as unknown as Record<string, CandidateAnswer>) ?? {};
    return {
      ...base,
      band: skillBand(module, raw, total),
      raw,
      total,
      answers: buildAnswerRows(engine, answerKey ?? {}, answers)
    };
  });

  const bandOf = (module: string) => skills.find((s) => s.module === module)?.band ?? null;
  const listening = bandOf("listening");
  const reading = bandOf("reading");
  const writing = bandOf("writing");
  const speaking = attempt.speakingBand ?? null;

  return {
    brand: "ZiyoMock",
    heading: "DETAILED RESULT",
    candidate: attempt.candidate.name ?? attempt.candidate.email,
    email: attempt.candidate.email,
    groupName: attempt.candidate.groupMemberships.map((g) => g.group.name).join(", "),
    mockTitle: attempt.mockExam.title,
    date: longDate(attempt.submittedAt),
    generatedAt: longDate(new Date()),
    listening,
    reading,
    writing,
    speaking,
    overall: overallBandFrom([listening, reading, writing, speaking]),
    skills
  };
}

export const CANDIDATE_DETAIL_COLUMNS = ["Skill", "Question", "Candidate answer", "Accepted", "Result"];

export function candidateDetailDataset(detail: CandidateDetail): Dataset {
  const rows: (string | number | null)[][] = [];
  for (const skill of detail.skills) {
    for (const answer of skill.answers) {
      rows.push([
        skill.label,
        answer.number,
        answer.candidate,
        answer.accepted,
        answer.correct ? "Correct" : "Incorrect"
      ]);
    }
    for (const task of skill.writingTasks) {
      rows.push([skill.label, `Task ${task.number}`, "", "", bandLabel(task.band)]);
    }
  }
  return {
    title: `${detail.heading} — ${detail.candidate}`,
    scopeLabel: `${detail.mockTitle} · ${detail.date}`,
    generatedAt: detail.generatedAt,
    columns: CANDIDATE_DETAIL_COLUMNS,
    rows,
    objects: rows.map((r) =>
      Object.fromEntries(CANDIDATE_DETAIL_COLUMNS.map((c, i) => [c, r[i] ?? ""]))
    )
  };
}
