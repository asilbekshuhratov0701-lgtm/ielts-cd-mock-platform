import { FileBarChart, Users, ClipboardCheck, Trophy, Percent } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ExportMenu } from "@/components/candidates/ExportMenu";
import { computeReports } from "@/lib/exports/reports";
import type { Dataset } from "@/lib/exports/gather";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

function ReportTable({ dataset }: { dataset: Dataset }) {
  if (dataset.rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No data yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            {dataset.columns.map((col) => (
              <th key={col} className="px-3 py-2 font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {dataset.rows.map((row, r) => (
            <tr key={r} className="hover:bg-brand-50/30">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={c === 0 ? "px-3 py-2 font-medium text-foreground" : "px-3 py-2 text-muted"}
                >
                  {cell ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportSection({
  title,
  description,
  type,
  dataset
}: {
  title: string;
  description: string;
  type: string;
  dataset: Dataset;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted">{description}</p>
        </div>
        <ExportMenu endpoint="report" params={{ type }} label="Export" />
      </div>
      <ReportTable dataset={dataset} />
    </Card>
  );
}

export default async function AdminReportsPage() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const { summary, exam, attendance, bands } = await computeReports(me?.orgId ?? "");

  return (
    <PageShell
      title="Reports"
      subtitle="Performance, attendance, and band distribution — export to Excel, PDF, Word, CSV, or JSON."
      actions={
        <div className="flex items-center gap-2">
          <ExportMenu endpoint="results" params={{}} label="All results" />
          <ExportMenu endpoint="writing" params={{}} label="All writing" />
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Mock exams" value={summary.mocks} icon={FileBarChart} />
        <StatCard label="Candidates assigned" value={summary.assigned} icon={Users} />
        <StatCard label="Submissions" value={summary.submitted} icon={ClipboardCheck} />
        <StatCard
          label="Average band"
          value={summary.avgOverall == null ? "—" : summary.avgOverall.toFixed(1)}
          icon={Trophy}
        />
        <StatCard
          label={`Pass rate (≥ ${summary.passBand})`}
          value={summary.passRate == null ? "—" : `${summary.passRate}%`}
          icon={Percent}
        />
      </div>

      <ReportSection
        title="Exam performance"
        description="Per mock: how many were assigned, submissions, average band by skill, and pass rate."
        type="exam"
        dataset={exam}
      />

      <ReportSection
        title="Attendance"
        description="Per mock: assigned candidates versus those who started and completed it."
        type="attendance"
        dataset={attendance}
      />

      <ReportSection
        title="Band distribution"
        description="How submitted overall bands are spread across your centre."
        type="bands"
        dataset={bands}
      />
    </PageShell>
  );
}
