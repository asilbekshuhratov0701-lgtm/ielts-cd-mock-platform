import { Activity, Clock, Wifi, WifiOff } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { listLiveSessions, type LiveConnection } from "@/lib/live";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { AutoRefresh } from "@/components/AutoRefresh";

export const metadata = { title: "Live Exam Center" };
export const dynamic = "force-dynamic";

function fmt(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const CONNECTION: Record<
  LiveConnection,
  { label: string; variant: "success" | "warning" | "danger" | "muted" }
> = {
  live: { label: "Live", variant: "success" },
  idle: { label: "Idle", variant: "warning" },
  offline: { label: "Offline", variant: "danger" },
  unknown: { label: "Unknown", variant: "muted" }
};

export default async function AdminLivePage() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const sessions = await listLiveSessions(me?.orgId ?? "");

  const live = sessions.filter((s) => s.connection === "live").length;
  const offline = sessions.filter((s) => s.connection === "offline").length;
  const expired = sessions.filter((s) => s.expired).length;

  return (
    <PageShell
      title="Live Exam Center"
      subtitle="Active candidates, refreshed automatically every 10 seconds."
      actions={<Badge variant="default">polling · 10s</Badge>}
    >
      <AutoRefresh seconds={10} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active sessions" value={sessions.length} icon={Activity} />
        <StatCard label="Live" value={live} icon={Wifi} />
        <StatCard label="Offline" value={offline} icon={WifiOff} />
        <StatCard label="Past deadline" value={expired} icon={Clock} />
      </div>

      {sessions.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No exams in progress right now.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-brand-50/40 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Section</th>
                <th className="px-4 py-3 font-medium">Time left</th>
                <th className="px-4 py-3 font-medium">Connection</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((s) => {
                const conn = CONNECTION[s.connection];
                return (
                  <tr key={s.id} className="hover:bg-brand-50/30">
                    <td className="px-4 py-3 font-medium text-foreground">{s.candidate}</td>
                    <td className="px-4 py-3 text-muted">{s.examTitle}</td>
                    <td className="px-4 py-3">
                      <Badge variant="muted">{s.sectionKind}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono tabular-nums ${s.expired ? "text-red-600" : s.remainingSec <= 60 ? "text-amber-600" : "text-foreground"}`}
                      >
                        {s.expired ? "00:00" : fmt(s.remainingSec)}
                      </span>
                      {s.expired ? (
                        <Badge variant="danger" className="ml-2">
                          auto-submit due
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={conn.variant}>{conn.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {s.heartbeatAgeSec == null ? "—" : `${s.heartbeatAgeSec}s ago`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}
