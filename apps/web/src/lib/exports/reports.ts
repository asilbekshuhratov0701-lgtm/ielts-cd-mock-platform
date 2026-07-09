import { prisma } from "@ielts/db";
import { partSummaryBand, overallBandFrom, bandLabel } from "@/lib/mock-band";
import { SETTING_KEYS, getNumberSetting } from "@/lib/settings";
import type { Dataset } from "./gather";

export type ReportType = "exam" | "attendance" | "bands";

interface SummaryPart {
  module: string;
  rawScore: number;
  totalScore: number;
  band?: number | null;
}

export interface ReportSummary {
  passBand: number;
  mocks: number;
  assigned: number;
  submitted: number;
  avgOverall: number | null;
  passRate: number | null;
}

function fmtNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function makeDataset(
  title: string,
  columns: string[],
  rows: (string | number | null)[][]
): Dataset {
  return {
    title,
    scopeLabel: "All exams",
    generatedAt: fmtNow(),
    columns,
    rows,
    objects: rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] ?? ""])))
  };
}

function attemptBands(resultJson: unknown) {
  const parts = (resultJson as { parts?: SummaryPart[] } | null)?.parts ?? [];
  const bandFor = (module: string) => {
    const part = parts.find((p) => p.module === module);
    return part ? partSummaryBand(part) : null;
  };
  const listening = bandFor("listening");
  const reading = bandFor("reading");
  const writing = bandFor("writing");
  return { listening, reading, writing, overall: overallBandFrom([listening, reading, writing]) };
}

function average(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return present.reduce((s, v) => s + v, 0) / present.length;
}

export async function computeReports(orgId: string): Promise<{
  summary: ReportSummary;
  exam: Dataset;
  attendance: Dataset;
  bands: Dataset;
}> {
  const passBand = await getNumberSetting(orgId, SETTING_KEYS.passBand, 6.5);
  const [mocks, groups] = await Promise.all([
    prisma.mockExam.findMany({
      where: { orgId },
      include: {
        assignments: true,
        attempts: { select: { candidateId: true, status: true, resultJson: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.candidateGroup.findMany({
      where: { orgId },
      include: { members: { select: { candidateId: true } } }
    })
  ]);
  const groupMembers = new Map(groups.map((g) => [g.id, g.members.map((m) => m.candidateId)]));

  const examRows: (string | number | null)[][] = [];
  const attendanceRows: (string | number | null)[][] = [];
  const bandCounts = new Map<number, number>();

  const distinctAssigned = new Set<string>();
  const allOverall: number[] = [];
  let totalSubmitted = 0;
  let totalPass = 0;

  for (const mock of mocks) {
    const assigned = new Set<string>();
    for (const assignment of mock.assignments) {
      if (assignment.candidateId) assigned.add(assignment.candidateId);
      if (assignment.groupId) {
        for (const cid of groupMembers.get(assignment.groupId) ?? []) assigned.add(cid);
      }
    }
    for (const cid of assigned) distinctAssigned.add(cid);

    const started = new Set(mock.attempts.map((a) => a.candidateId));
    const completed = new Set(
      mock.attempts.filter((a) => a.status === "submitted").map((a) => a.candidateId)
    );
    const submitted = mock.attempts.filter((a) => a.status === "submitted");
    const bands = submitted.map((a) => attemptBands(a.resultJson));

    const avgL = average(bands.map((b) => b.listening));
    const avgR = average(bands.map((b) => b.reading));
    const avgW = average(bands.map((b) => b.writing));
    const avgO = average(bands.map((b) => b.overall));
    const passCount = bands.filter((b) => b.overall !== null && b.overall >= passBand).length;
    const passRate = submitted.length ? Math.round((passCount / submitted.length) * 100) : null;

    for (const b of bands) {
      if (b.overall !== null) {
        allOverall.push(b.overall);
        bandCounts.set(b.overall, (bandCounts.get(b.overall) ?? 0) + 1);
      }
    }
    totalSubmitted += submitted.length;
    totalPass += passCount;

    examRows.push([
      mock.title,
      mock.state,
      assigned.size,
      submitted.length,
      bandLabel(avgL),
      bandLabel(avgR),
      bandLabel(avgW),
      bandLabel(avgO),
      passRate === null ? "—" : `${passRate}%`
    ]);

    const startedAssigned = [...assigned].filter((id) => started.has(id)).length;
    const completedAssigned = [...assigned].filter((id) => completed.has(id)).length;
    attendanceRows.push([
      mock.title,
      assigned.size,
      startedAssigned,
      completedAssigned,
      assigned.size - startedAssigned,
      assigned.size ? `${Math.round((completedAssigned / assigned.size) * 100)}%` : "—"
    ]);
  }

  const bandRows = [...bandCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([band, count]) => [
      bandLabel(band),
      count,
      allOverall.length ? `${Math.round((count / allOverall.length) * 100)}%` : "0%"
    ]);

  const summary: ReportSummary = {
    passBand,
    mocks: mocks.length,
    assigned: distinctAssigned.size,
    submitted: totalSubmitted,
    avgOverall: allOverall.length
      ? allOverall.reduce((s, v) => s + v, 0) / allOverall.length
      : null,
    passRate: totalSubmitted ? Math.round((totalPass / totalSubmitted) * 100) : null
  };

  return {
    summary,
    exam: makeDataset(
      "Exam Performance Report",
      ["Mock", "State", "Assigned", "Submissions", "Avg L", "Avg R", "Avg W", "Avg Overall", "Pass rate"],
      examRows
    ),
    attendance: makeDataset(
      "Attendance Report",
      ["Mock", "Assigned", "Started", "Completed", "Not started", "Completion"],
      attendanceRows
    ),
    bands: makeDataset("Band Distribution Report", ["Overall band", "Candidates", "Share"], bandRows)
  };
}

export async function gatherReport(orgId: string, type: ReportType): Promise<Dataset> {
  const reports = await computeReports(orgId);
  if (type === "attendance") return reports.attendance;
  if (type === "bands") return reports.bands;
  return reports.exam;
}
