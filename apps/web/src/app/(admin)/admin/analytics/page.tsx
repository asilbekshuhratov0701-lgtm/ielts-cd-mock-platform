import { BarChart3, CheckCircle2, PenLine, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { getAnalytics } from "@/lib/analytics";
import { PageShell } from "@/components/Shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  ActivityChart,
  BandDistributionChart,
  SkillAveragesChart,
  StatusChart
} from "@/components/analytics-charts";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const data = await getAnalytics(me?.orgId ?? "");

  return (
    <PageShell title="Analytics" subtitle="Performance and activity across your centre.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total attempts" value={data.totals.attempts} icon={BarChart3} />
        <StatCard label="Published results" value={data.totals.published} icon={CheckCircle2} />
        <StatCard
          label="Average band"
          value={data.totals.avgOverall == null ? "—" : data.totals.avgOverall.toFixed(1)}
          icon={Trophy}
        />
        <StatCard label="Writing pending" value={data.totals.writingPending} icon={PenLine} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overall band distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <BandDistributionChart data={data.bandDistribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average band by skill</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillAveragesChart data={data.skillAverages} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submissions (last 14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart data={data.activity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attempts by status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.statusBreakdown.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted">No attempts yet.</p>
            ) : (
              <StatusChart data={data.statusBreakdown} />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
