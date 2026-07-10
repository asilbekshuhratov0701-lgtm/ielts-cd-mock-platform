import { prisma } from "@ielts/db";

export type AnalyticsData = {
  totals: {
    attempts: number;
    published: number;
    avgOverall: number | null;
    writingPending: number;
  };
  skillAverages: { skill: string; band: number }[];
  bandDistribution: { band: string; count: number }[];
  bandTrend: { label: string; band: number }[];
  statusBreakdown: { status: string; count: number }[];
  activity: { date: string; submissions: number }[];
};

function avg(values: number[]): number | null {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

function round1(value: number | null): number | null {
  return value == null ? null : Math.round(value * 10) / 10;
}

export async function getAnalytics(orgId: string): Promise<AnalyticsData> {
  const [scores, attempts] = await Promise.all([
    prisma.score.findMany({
      where: { attempt: { exam: { orgId } } },
      select: {
        listeningBand: true,
        readingBand: true,
        writingBand: true,
        overallBand: true,
        createdAt: true
      }
    }),
    prisma.attempt.findMany({
      where: { exam: { orgId } },
      select: { status: true, submittedAt: true }
    })
  ]);

  const listening = scores.map((s) => s.listeningBand).filter((b): b is number => b != null);
  const reading = scores.map((s) => s.readingBand).filter((b): b is number => b != null);
  const writing = scores.map((s) => s.writingBand).filter((b): b is number => b != null);
  const overall = scores.map((s) => s.overallBand).filter((b): b is number => b != null);

  const skillAverages = [
    { skill: "Listening", band: round1(avg(listening)) ?? 0 },
    { skill: "Reading", band: round1(avg(reading)) ?? 0 },
    { skill: "Writing", band: round1(avg(writing)) ?? 0 },
    { skill: "Overall", band: round1(avg(overall)) ?? 0 }
  ];

  const buckets = new Map<string, number>();
  for (let b = 4; b <= 9; b += 0.5) buckets.set(b.toFixed(1), 0);
  for (const band of overall) {
    const key = (Math.round(band * 2) / 2).toFixed(1);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const bandDistribution = [...buckets.entries()].map(([band, count]) => ({ band, count }));

  const months: { label: string; key: string; bands: number[] }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString(undefined, { month: "short" }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      bands: []
    });
  }
  const byMonth = new Map(months.map((m) => [m.key, m]));
  for (const s of scores) {
    if (s.overallBand == null) continue;
    const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, "0")}`;
    byMonth.get(key)?.bands.push(s.overallBand);
  }
  const bandTrend = months.map((m) => ({ label: m.label, band: round1(avg(m.bands)) ?? 0 }));

  const statusMap = new Map<string, number>();
  for (const a of attempts) statusMap.set(a.status, (statusMap.get(a.status) ?? 0) + 1);
  const statusBreakdown = [...statusMap.entries()].map(([status, count]) => ({ status, count }));

  const days: { date: string; key: string; submissions: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      key: d.toISOString().slice(0, 10),
      submissions: 0
    });
  }
  const byDay = new Map(days.map((d) => [d.key, d]));
  for (const a of attempts) {
    if (!a.submittedAt) continue;
    const key = a.submittedAt.toISOString().slice(0, 10);
    const day = byDay.get(key);
    if (day) day.submissions += 1;
  }
  const activity = days.map((d) => ({ date: d.date, submissions: d.submissions }));

  return {
    totals: {
      attempts: attempts.length,
      published: scores.filter((s) => s.overallBand != null).length,
      avgOverall: round1(avg(overall)),
      writingPending: attempts.filter((a) => a.status === "SUBMITTED").length
    },
    skillAverages,
    bandDistribution,
    bandTrend,
    statusBreakdown,
    activity
  };
}
