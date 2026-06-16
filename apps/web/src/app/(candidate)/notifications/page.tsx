import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listNotifications } from "@/lib/notifications";
import { markAllReadAction } from "@/lib/notifications-actions";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function describe(type: string, payload: unknown): { text: string; href: string | null } {
  const p = (payload ?? {}) as { attemptId?: string; examTitle?: string };
  if (type === "result.released") {
    return {
      text: `Your results for ${p.examTitle ?? "your exam"} are ready to view.`,
      href: p.attemptId ? `/results/${p.attemptId}` : "/results"
    };
  }
  return { text: type, href: null };
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const items = await listNotifications(session.user.id);
  const hasUnread = items.some((n) => n.readAt == null);

  return (
    <PageShell
      title="Notifications"
      subtitle="Updates about your exams and results."
      actions={
        hasUnread ? (
          <form action={markAllReadAction}>
            <Button type="submit" variant="outline" size="sm">
              Mark all as read
            </Button>
          </form>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No notifications yet.</Card>
      ) : (
        <Card className="divide-y divide-border">
          {items.map((n) => {
            const { text, href } = describe(n.type, n.payloadJson);
            const unread = n.readAt == null;
            const body = (
              <div className="flex items-start gap-3 px-4 py-3">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    unread ? "bg-brand-600" : "bg-transparent"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={unread ? "text-sm font-medium text-foreground" : "text-sm text-muted"}>
                    {text}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            );
            return href ? (
              <Link key={n.id} href={href} className="block hover:bg-brand-50/30">
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </Card>
      )}
    </PageShell>
  );
}
