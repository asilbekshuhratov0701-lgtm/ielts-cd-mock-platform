import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "System Logs" };
export const dynamic = "force-dynamic";

function summarizeMeta(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  return Object.entries(meta as Record<string, unknown>)
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

export default async function AdminLogsPage() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;

  const logs = await prisma.auditLog.findMany({
    where: { orgId: me?.orgId ?? "" },
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <PageShell title="System Logs" subtitle="Audit trail of key administrative and exam actions.">
      {logs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          No activity logged yet. Actions like publishing exams/results, managing users, and AI
          imports are recorded here.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-brand-50/40 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="align-top hover:bg-brand-50/30">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {log.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {log.actor?.name ?? log.actor?.email ?? "system"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {log.entity
                      ? `${log.entity}${log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{summarizeMeta(log.metaJson)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}
