import { Activity, AlertTriangle, Clock, Pause, Play, Plus, Wifi, WifiOff } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { listLiveSessions, type LiveConnection } from "@/lib/live";
import { pauseAttemptAction, resumeAttemptAction, grantTimeAction } from "@/lib/live-actions";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  unknown: { label: "Paused", variant: "muted" }
};

export default async function AdminLivePage() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const sessions = await listLiveSessions(me?.orgId ?? "");

  const live = sessions.filter((s) => s.connection === "live").length;
  const offline = sessions.filter((s) => s.connection === "offline").length;
  const attention = sessions.filter((s) => s.needsAttention).length;

  return (
    <PageShell
      title="Live Exam Center"
      subtitle="Monitor active candidates, freeze the clock on a crash, and grant time to resume."
      actions={<Badge variant="default">polling · 10s</Badge>}
    >
      <AutoRefresh seconds={10} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active sessions" value={sessions.length} icon={Activity} />
        <StatCard label="Live" value={live} icon={Wifi} />
        <StatCard label="Offline" value={offline} icon={WifiOff} />
        <StatCard label="Needs attention" value={attention} icon={AlertTriangle} />
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
                <th className="px-4 py-3 font-medium">Skill</th>
                <th className="px-4 py-3 font-medium">Answered</th>
                <th className="px-4 py-3 font-medium">Time left</th>
                <th className="px-4 py-3 font-medium">Connection</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
                <th className="px-4 py-3 font-medium">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((s) => {
                const conn = CONNECTION[s.connection];
                return (
                  <tr
                    key={s.id}
                    className={s.needsAttention ? "bg-amber-50/40" : "hover:bg-brand-50/30"}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{s.candidate}</td>
                    <td className="px-4 py-3 text-muted">{s.examTitle}</td>
                    <td className="px-4 py-3">
                      <Badge variant="muted">{s.sectionKind}</Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {s.answered}/{s.totalQuestions}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono tabular-nums ${
                          s.paused
                            ? "text-muted"
                            : s.expired
                              ? "text-red-600"
                              : s.remainingSec <= 60
                                ? "text-amber-600"
                                : "text-foreground"
                        }`}
                      >
                        {fmt(s.remainingSec)}
                      </span>
                      {s.paused ? (
                        <Badge variant="muted" className="ml-2">
                          frozen
                        </Badge>
                      ) : s.expired ? (
                        <Badge variant="danger" className="ml-2">
                          time up
                        </Badge>
                      ) : null}
                      {s.grantedExtraSec > 0 ? (
                        <span className="ml-2 text-xs text-muted">
                          +{Math.round(s.grantedExtraSec / 60)}m granted
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={conn.variant}>{conn.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {s.heartbeatAgeSec == null ? "—" : `${s.heartbeatAgeSec}s ago`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {s.paused ? (
                          <form action={resumeAttemptAction} className="flex items-center gap-1">
                            <input type="hidden" name="attemptId" value={s.id} />
                            <Input
                              name="extraMinutes"
                              type="number"
                              min={0}
                              max={180}
                              defaultValue={0}
                              aria-label="Extra minutes on resume"
                              className="h-8 w-16 tabular-nums"
                            />
                            <Button type="submit" variant="secondary" size="sm">
                              <Play className="h-3.5 w-3.5" /> Resume
                            </Button>
                          </form>
                        ) : (
                          <form action={pauseAttemptAction}>
                            <input type="hidden" name="attemptId" value={s.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              <Pause className="h-3.5 w-3.5" /> Freeze
                            </Button>
                          </form>
                        )}
                        <form action={grantTimeAction} className="flex items-center gap-1">
                          <input type="hidden" name="attemptId" value={s.id} />
                          <input type="hidden" name="extraMinutes" value="5" />
                          <Button type="submit" variant="ghost" size="sm">
                            <Plus className="h-3.5 w-3.5" /> 5 min
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <p className="mt-4 text-xs text-muted">
        <Clock className="mr-1 inline h-3 w-3" />
        If a candidate&apos;s machine crashes, their answers are already saved. Freeze the clock so
        no more time is lost, then Resume (optionally adding minutes) once they are back at the
        machine — they continue from the same question, in the same skill.
      </p>
    </PageShell>
  );
}
