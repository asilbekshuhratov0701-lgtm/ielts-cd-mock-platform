import { prisma } from "@ielts/db";
import { partSummaryBand, overallBandFrom, bandLabel, type SummaryPart } from "@/lib/mock-band";
import type { Dataset } from "./gather";

export interface GroupSummaryRow {
  position: number;
  candidate: string;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  overall: number | null;
}

export interface GroupSummary {
  brand: string;
  heading: string;
  mockTitle: string;
  groupName: string;
  date: string;
  candidateCount: number;
  generatedAt: string;
  rows: GroupSummaryRow[];
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

export function longDate(value: Date | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export async function gatherGroupSummary(orgId: string, groupId: string): Promise<GroupSummary> {
  const group = await prisma.candidateGroup.findFirst({
    where: { id: groupId, orgId },
    include: { members: { select: { candidateId: true } } }
  });
  if (!group) throw new Error("Group not found");

  const candidateIds = group.members.map((m) => m.candidateId);

  const latest = candidateIds.length
    ? await prisma.mockAttempt.findFirst({
        where: {
          status: "submitted",
          candidateId: { in: candidateIds },
          mockExam: { orgId }
        },
        orderBy: { submittedAt: "desc" },
        select: { mockExamId: true, submittedAt: true, mockExam: { select: { title: true } } }
      })
    : null;

  const attempts = latest
    ? await prisma.mockAttempt.findMany({
        where: {
          status: "submitted",
          mockExamId: latest.mockExamId,
          candidateId: { in: candidateIds }
        },
        include: { candidate: { select: { name: true, email: true } } }
      })
    : [];

  const rows: GroupSummaryRow[] = attempts
    .map((attempt) => {
      const parts = (attempt.resultJson as unknown as { parts?: SummaryPart[] } | null)?.parts ?? [];
      const bandOf = (module: string) => {
        const part = parts.find((p) => p.module === module);
        return part ? partSummaryBand(part) : null;
      };
      const listening = bandOf("listening");
      const reading = bandOf("reading");
      const writing = bandOf("writing");
      const speaking = attempt.speakingBand ?? null;
      return {
        position: 0,
        candidate: attempt.candidate.name ?? attempt.candidate.email,
        listening,
        reading,
        writing,
        speaking,
        overall: overallBandFrom([listening, reading, writing, speaking])
      };
    })
    .sort((a, b) => a.candidate.localeCompare(b.candidate))
    .map((row, i) => ({ ...row, position: i + 1 }));

  return {
    brand: "ZiyoMock",
    heading: "GROUP RESULTS",
    mockTitle: latest?.mockExam.title ?? "No submitted mock",
    groupName: group.name,
    date: longDate(latest?.submittedAt ?? null),
    candidateCount: rows.length,
    generatedAt: longDate(new Date()),
    rows
  };
}

export const GROUP_SUMMARY_COLUMNS = [
  "#",
  "Candidate",
  "Listening",
  "Reading",
  "Writing",
  "Speaking",
  "Overall"
];

export function groupSummaryDataset(summary: GroupSummary): Dataset {
  const rows = summary.rows.map((r) => [
    String(r.position).padStart(2, "0"),
    r.candidate,
    bandLabel(r.listening),
    bandLabel(r.reading),
    bandLabel(r.writing),
    bandLabel(r.speaking),
    bandLabel(r.overall)
  ]);
  return {
    title: `${summary.heading} — ${summary.mockTitle}`,
    scopeLabel: `${summary.groupName} · ${summary.date} · ${summary.candidateCount} candidate(s)`,
    generatedAt: summary.generatedAt,
    columns: GROUP_SUMMARY_COLUMNS,
    rows,
    objects: rows.map((r) =>
      Object.fromEntries(GROUP_SUMMARY_COLUMNS.map((c, i) => [c, r[i] ?? ""]))
    )
  };
}
