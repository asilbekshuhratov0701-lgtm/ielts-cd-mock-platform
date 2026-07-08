import { prisma } from "@ielts/db";
import { partSummaryBand, overallBandFrom, bandLabel } from "@/lib/mock-band";

export interface Dataset {
  title: string;
  scopeLabel: string;
  generatedAt: string;
  columns: string[];
  rows: (string | number | null)[][];
  objects: Record<string, string | number | null>[];
}

export interface WritingTaskDoc {
  number: number;
  prompt: string;
  essay: string;
  wordCount: number;
  band: number | null;
}

export interface WritingDoc {
  candidate: string;
  email: string;
  group: string;
  mock: string;
  submittedAt: string;
  overallWriting: string;
  tasks: WritingTaskDoc[];
}

interface Scope {
  orgId: string;
  groupId?: string;
  candidateId?: string;
}

interface SummaryPart {
  module: string;
  rawScore: number;
  totalScore: number;
  band?: number | null;
}

function fmtDate(value: Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function words(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

async function resolveScope(scope: Scope): Promise<{ candidateIds?: string[]; scopeLabel: string }> {
  if (scope.groupId) {
    const group = await prisma.candidateGroup.findFirst({
      where: { id: scope.groupId, orgId: scope.orgId },
      include: { members: { select: { candidateId: true } } }
    });
    if (!group) throw new Error("Group not found");
    return { candidateIds: group.members.map((m) => m.candidateId), scopeLabel: `Group — ${group.name}` };
  }
  if (scope.candidateId) {
    const candidate = await prisma.user.findFirst({
      where: { id: scope.candidateId, orgId: scope.orgId }
    });
    if (!candidate) throw new Error("Candidate not found");
    return {
      candidateIds: [scope.candidateId],
      scopeLabel: `Candidate — ${candidate.name ?? candidate.email}`
    };
  }
  return { scopeLabel: "All candidates" };
}

export async function gatherResults(scope: Scope): Promise<Dataset> {
  const { candidateIds, scopeLabel } = await resolveScope(scope);

  const attempts = await prisma.mockAttempt.findMany({
    where: {
      status: "submitted",
      mockExam: { orgId: scope.orgId },
      ...(candidateIds ? { candidateId: { in: candidateIds } } : {})
    },
    include: {
      candidate: {
        select: {
          name: true,
          email: true,
          groupMemberships: { select: { group: { select: { name: true } } } }
        }
      },
      mockExam: { select: { title: true } }
    },
    orderBy: [{ submittedAt: "desc" }]
  });

  const columns = [
    "Candidate",
    "Email",
    "Group(s)",
    "Mock",
    "Submitted",
    "Listening",
    "L. band",
    "Reading",
    "R. band",
    "Writing band",
    "Overall band",
    "Released"
  ];

  const rows: (string | number | null)[][] = [];
  const objects: Record<string, string | number | null>[] = [];

  for (const attempt of attempts) {
    const summary = attempt.resultJson as unknown as { parts?: SummaryPart[] } | null;
    const parts = summary?.parts ?? [];
    const part = (module: string) => parts.find((p) => p.module === module);
    const listening = part("listening");
    const reading = part("reading");
    const writing = part("writing");

    const lBand = listening ? partSummaryBand(listening) : null;
    const rBand = reading ? partSummaryBand(reading) : null;
    const wBand = writing ? partSummaryBand(writing) : null;
    const overall = overallBandFrom([lBand, rBand, wBand]);

    const groups = attempt.candidate.groupMemberships.map((g) => g.group.name).join(", ");
    const rawOf = (p?: SummaryPart) => (p ? `${p.rawScore}/${p.totalScore}` : "");

    const row: (string | number | null)[] = [
      attempt.candidate.name ?? attempt.candidate.email,
      attempt.candidate.email,
      groups,
      attempt.mockExam.title,
      fmtDate(attempt.submittedAt),
      rawOf(listening),
      bandLabel(lBand),
      rawOf(reading),
      bandLabel(rBand),
      bandLabel(wBand),
      bandLabel(overall),
      attempt.resultsReleased ? "Yes" : "No"
    ];
    rows.push(row);
    objects.push(Object.fromEntries(columns.map((c, i) => [c, row[i] ?? ""])));
  }

  return {
    title: "Mock Results",
    scopeLabel,
    generatedAt: fmtDate(new Date()),
    columns,
    rows,
    objects
  };
}

export async function gatherWriting(scope: Scope): Promise<{ scopeLabel: string; docs: WritingDoc[] }> {
  const { candidateIds, scopeLabel } = await resolveScope(scope);

  const attempts = await prisma.mockAttempt.findMany({
    where: {
      status: "submitted",
      mockExam: { orgId: scope.orgId },
      ...(candidateIds ? { candidateId: { in: candidateIds } } : {})
    },
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
    },
    orderBy: [{ submittedAt: "desc" }]
  });

  const docs: WritingDoc[] = [];

  for (const attempt of attempts) {
    const writingParts = attempt.partAttempts.filter((p) => p.blueprint.module === "writing");
    if (writingParts.length === 0) continue;

    const tasks: WritingTaskDoc[] = [];
    for (const part of writingParts) {
      const engine = part.blueprint.engineJson as unknown as {
        sections?: { groups?: { inputKind?: string; tasks?: { id: string; number: number; prompt: string }[] }[] }[];
      };
      const answers = (part.answersJson as unknown as Record<string, unknown>) ?? {};
      const mark = part.resultJson as unknown as {
        tasks?: { taskNumber: number; taskBand: number }[];
      } | null;

      const essayTasks = (engine.sections ?? [])
        .flatMap((s) => s.groups ?? [])
        .filter((g) => g.inputKind === "essay")
        .flatMap((g) => g.tasks ?? [])
        .sort((a, b) => a.number - b.number);

      for (const task of essayTasks) {
        const essay = typeof answers[task.id] === "string" ? (answers[task.id] as string) : "";
        const band = mark?.tasks?.find((t) => t.taskNumber === task.number)?.taskBand ?? null;
        tasks.push({
          number: task.number,
          prompt: task.prompt,
          essay,
          wordCount: words(essay),
          band
        });
      }
    }

    if (tasks.length === 0) continue;

    const overallWriting = (() => {
      const summary = attempt.resultJson as unknown as { parts?: SummaryPart[] } | null;
      const writing = summary?.parts?.find((p) => p.module === "writing");
      return bandLabel(writing ? partSummaryBand(writing) : null);
    })();

    docs.push({
      candidate: attempt.candidate.name ?? attempt.candidate.email,
      email: attempt.candidate.email,
      group: attempt.candidate.groupMemberships.map((g) => g.group.name).join(", "),
      mock: attempt.mockExam.title,
      submittedAt: fmtDate(attempt.submittedAt),
      overallWriting,
      tasks
    });
  }

  return { scopeLabel, docs };
}
