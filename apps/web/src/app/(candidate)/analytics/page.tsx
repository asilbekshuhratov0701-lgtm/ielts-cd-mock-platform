import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Target, TrendingUp, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BandTrendChart, SkillAveragesChart } from "@/components/analytics-charts";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

function band(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(1);
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

function round1(value: number | null): number | null {
  return value == null ? null : Math.round(value * 10) / 10;
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [attempts, profile] = await Promise.all([
    prisma.attempt.findMany({
      where: { candidateId: session.user.id, score: { publishedAt: { not: null } } },
      include: { exam: { select: { title: true } }, score: true },
      orderBy: { submittedAt: "asc" }
    }),
    prisma.candidateProfile.findUnique({ where: { userId: session.user.id } })
  ]);

  const scored = attempts.filter((a) => a.score?.overallBand != null);
  const overalls = scored.map((a) => a.score!.overallBand!);
  const listening = scored.map((a) => a.score?.listeningBand).filter((b): b is number => b != null);
  const reading = scored.map((a) => a.score?.readingBand).filter((b): b is number => b != null);
  const writing = scored.map((a) => a.score?.writingBand).filter((b): b is number => b != null);

  const avgOverall = round1(average(overalls));
  const bestOverall = overalls.length ? Math.max(...overalls) : null;
  const latestOverall = overalls.length ? overalls[overalls.length - 1]! : null;
  const target = profile?.targetBand ?? null;

  const trend = scored.map((a) => ({
    label: a.submittedAt ? a.submittedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—",
    band: a.score!.overallBand!
  }));

  const skillAverages = [
    { skill: "Listening", band: round1(average(listening)) ?? 0 },
    { skill: "Reading", band: round1(average(reading)) ?? 0 },
    { skill: "Writing", band: round1(average(writing)) ?? 0 }
  ];
  const measuredSkills = skillAverages.filter((s) => s.band > 0);
  const weakest = measuredSkills.length
    ? measuredSkills.reduce((min, s) => (s.band < min.band ? s : min))
    : null;

  if (scored.length === 0) {
    return (
      <PageShell
        title="Progress Analytics"
        subtitle="Score trends, skill breakdown and target tracking."
      >
        <Card className="p-10 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-brand-400" />
          <h2 className="mt-3 font-semibold text-foreground">No results to analyse yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Once your examiner releases the results of a completed mock, your band trends and skill
            breakdown will appear here.
          </p>
          <Link href="/exams" className="mt-5 inline-block">
            <Button>
              Take a mock exam <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Progress Analytics"
      subtitle="Score trends, skill breakdown and target tracking."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Average overall band"
          value={band(avgOverall)}
          icon={Trophy}
          hint={`Across ${overalls.length} published result(s)`}
        />
        <StatCard label="Best overall band" value={band(bestOverall)} icon={TrendingUp} />
        <StatCard label="Latest overall band" value={band(latestOverall)} icon={ArrowRight} />
        <StatCard
          label="Target band"
          value={band(target)}
          icon={Target}
          hint={
            target == null
              ? "Set a target in your profile"
              : latestOverall != null && latestOverall >= target
                ? "Target reached"
                : `${round1(target - (latestOverall ?? 0))} band to go`
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overall band over time</CardTitle>
          </CardHeader>
          <CardContent>
            <BandTrendChart data={trend} target={target} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average band by skill</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillAveragesChart data={skillAverages} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Focus area</CardTitle>
          </CardHeader>
          <CardContent>
            {weakest ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="warning">Weakest skill</Badge>
                  <span className="text-lg font-semibold text-foreground">{weakest.skill}</span>
                  <span className="text-sm text-muted">avg {band(weakest.band)}</span>
                </div>
                <ul className="divide-y divide-border text-sm">
                  {skillAverages.map((s) => (
                    <li key={s.skill} className="flex items-center justify-between py-2">
                      <span className="text-muted">{s.skill}</span>
                      <span className="font-medium text-foreground">{band(s.band || null)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted">
                  Your lowest average is in <strong className="text-foreground">{weakest.skill}</strong>.
                  Prioritise practice here to lift your overall band fastest.
                </p>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted">
                Skill averages appear once individual band scores are released.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
