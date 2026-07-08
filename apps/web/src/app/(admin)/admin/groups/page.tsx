import Link from "next/link";
import { Boxes, Users, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGroupAction } from "@/lib/candidate-admin-actions";

export const metadata = { title: "Groups" };

export default async function GroupsPage() {
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const orgId = me?.orgId ?? "";

  const groups = await prisma.candidateGroup.findMany({
    where: { orgId },
    include: { _count: { select: { members: true, mockAssignments: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <PageShell
      title="Groups"
      subtitle="Organise candidates into groups, then assign exams — evenly or shuffled."
    >
      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-foreground">New group</h2>
        <form action={createGroupAction} className="flex flex-wrap items-end gap-3">
          <Input name="name" required placeholder="e.g. Morning batch — July" className="w-72" />
          <Button type="submit">
            <Boxes className="h-4 w-4" /> Create group
          </Button>
        </form>
      </Card>

      {groups.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No groups yet.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/admin/groups/${group.id}`} className="block">
              <Card className="flex h-full items-center justify-between gap-3 p-4 transition-colors hover:bg-brand-50/40">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{group.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <Users className="h-3 w-3" /> {group._count.members} member
                    {group._count.members === 1 ? "" : "s"} · {group._count.mockAssignments} group
                    assignment{group._count.mockAssignments === 1 ? "" : "s"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
