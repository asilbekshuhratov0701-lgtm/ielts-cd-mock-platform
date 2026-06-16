import Link from "next/link";
import { auth } from "@/auth";
import { prisma, Prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export const metadata = { title: "System Logs" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const fieldClass =
  "h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function actionVariant(action: string) {
  if (/delete|remove|disable|revoke/i.test(action)) return "danger" as const;
  if (/create|add|invite/i.test(action)) return "success" as const;
  if (/publish/i.test(action)) return "brand" as const;
  if (/update|settings|edit/i.test(action)) return "warning" as const;
  return "default" as const;
}

function summarizeMeta(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  return Object.entries(meta as Record<string, unknown>)
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

function pageHref(params: { action: string; actor: string; page: number }): string {
  const sp = new URLSearchParams();
  if (params.action) sp.set("action", params.action);
  if (params.actor) sp.set("actor", params.actor);
  if (params.page > 1) sp.set("page", String(params.page));
  const query = sp.toString();
  return query ? `/admin/logs?${query}` : "/admin/logs";
}

export default async function AdminLogsPage({
  searchParams
}: {
  searchParams: Promise<{ action?: string; actor?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const actionFilter = first(sp.action);
  const actorFilter = first(sp.actor).trim();

  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const orgId = me?.orgId ?? "";

  const distinctActions = await prisma.auditLog.findMany({
    where: { orgId },
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" }
  });

  const where: Prisma.AuditLogWhereInput = { orgId };
  if (actionFilter) where.action = actionFilter;
  if (actorFilter) {
    where.actor = {
      OR: [{ name: { contains: actorFilter } }, { email: { contains: actorFilter } }]
    };
  }

  const total = await prisma.auditLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(first(sp.page)) || 1), totalPages);

  const logs = await prisma.auditLog.findMany({
    where,
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE
  });

  const hasFilters = Boolean(actionFilter || actorFilter);

  if (distinctActions.length === 0) {
    return (
      <PageShell title="System Logs" subtitle="Audit trail of key administrative and exam actions.">
        <Card className="p-8 text-center text-sm text-muted">
          No activity logged yet. Actions like publishing exams/results, managing users, and AI
          imports are recorded here.
        </Card>
      </PageShell>
    );
  }

  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  return (
    <PageShell title="System Logs" subtitle="Audit trail of key administrative and exam actions.">
      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="action">Action</Label>
            <select
              id="action"
              name="action"
              defaultValue={actionFilter}
              className={cn(fieldClass, "min-w-44")}
            >
              <option value="">All actions</option>
              {distinctActions.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.action}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="actor">Actor</Label>
            <input
              id="actor"
              name="actor"
              defaultValue={actorFilter}
              placeholder="name or email"
              className={cn(fieldClass, "w-56")}
            />
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          {hasFilters ? (
            <Link
              href="/admin/logs"
              className="text-sm text-muted underline-offset-4 hover:text-brand-700 hover:underline"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </Card>

      <Card className="overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">
            No entries match these filters.
          </div>
        ) : (
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
                    <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
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
        )}

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
          <span>
            {total === 0 ? "No entries" : `Showing ${firstRow}–${lastRow} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={pageHref({ action: actionFilter, actor: actorFilter, page: page - 1 })}>
                <Button variant="outline" size="sm">
                  Previous
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            <span className="text-xs">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageHref({ action: actionFilter, actor: actorFilter, page: page + 1 })}>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
