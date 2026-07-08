import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Shuffle, Users, UserPlus, Trash2, X } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExportMenu } from "@/components/candidates/ExportMenu";
import {
  addGroupMembersAction,
  assignMockToGroupAction,
  deleteGroupAction,
  removeGroupMemberAction,
  renameGroupAction,
  shuffleAssignAction,
  unassignMockFromGroupAction
} from "@/lib/candidate-admin-actions";

const checkboxRow =
  "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-brand-50/40";
const selectClass =
  "h-9 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

export default async function GroupDetailPage({
  params
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  if (!me) redirect("/login");
  const orgId = me.orgId;

  const group = await prisma.candidateGroup.findFirst({
    where: { id: groupId, orgId },
    include: {
      members: {
        include: { candidate: { select: { id: true, name: true, email: true } } }
      }
    }
  });
  if (!group) notFound();

  const memberIds = group.members.map((m) => m.candidateId);

  const [mocks, groupAssigned, perAssignments, nonMembers] = await Promise.all([
    prisma.mockExam.findMany({
      where: { orgId, state: "published" },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.mockAssignment.findMany({
      where: { groupId },
      include: { mockExam: { select: { id: true, title: true } } }
    }),
    memberIds.length > 0
      ? prisma.mockAssignment.findMany({
          where: { candidateId: { in: memberIds } },
          include: { mockExam: { select: { title: true } } }
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: {
        orgId,
        role: "CANDIDATE",
        ...(memberIds.length > 0 ? { id: { notIn: memberIds } } : {})
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    })
  ]);

  const groupAssignedIds = new Set(groupAssigned.map((a) => a.mockExamId));
  const perCandidateMocks = new Map<string, string[]>();
  for (const assignment of perAssignments) {
    if (!assignment.candidateId) continue;
    const list = perCandidateMocks.get(assignment.candidateId) ?? [];
    list.push(assignment.mockExam.title);
    perCandidateMocks.set(assignment.candidateId, list);
  }

  const unassignedMocks = mocks.filter((m) => !groupAssignedIds.has(m.id));

  return (
    <PageShell
      title={group.name}
      subtitle={`${group.members.length} member${group.members.length === 1 ? "" : "s"}`}
      actions={
        <div className="flex items-center gap-2">
          <ExportMenu endpoint="results" params={{ groupId }} label="Results" />
          <ExportMenu endpoint="writing" params={{ groupId }} label="Writing" />
        </div>
      }
    >
      <Link
        href="/admin/groups"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> All groups
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <form action={renameGroupAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="groupId" value={group.id} />
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted">Group name</span>
              <Input name="name" defaultValue={group.name} className="w-72" />
            </label>
            <Button type="submit" size="sm" variant="secondary">
              Rename
            </Button>
          </form>
          <form action={deleteGroupAction}>
            <input type="hidden" name="groupId" value={group.id} />
            <Button type="submit" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Delete group
            </Button>
          </form>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-foreground">Assign the same mock to everyone</h2>
          {unassignedMocks.length === 0 ? (
            <p className="text-sm text-muted">
              {mocks.length === 0 ? "No published mocks yet." : "All published mocks are assigned."}
            </p>
          ) : (
            <form action={assignMockToGroupAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="groupId" value={group.id} />
              <select name="mockExamId" className={selectClass} defaultValue={unassignedMocks[0]?.id}>
                {unassignedMocks.map((mock) => (
                  <option key={mock.id} value={mock.id}>
                    {mock.title}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline" size="sm">
                <Users className="h-4 w-4" /> Assign to group
              </Button>
            </form>
          )}

          {groupAssigned.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Assigned to whole group
              </p>
              {groupAssigned.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="truncate text-foreground">{assignment.mockExam.title}</span>
                  <form action={unassignMockFromGroupAction}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="mockExamId" value={assignment.mockExamId} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                    >
                      <X className="h-3.5 w-3.5" /> Remove
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Shuffle className="h-4 w-4 text-brand-600" /> Shuffle-assign a pool
          </h2>
          <p className="mt-1 text-sm text-muted">
            Each member is randomly given <strong>one</strong> of the selected mocks, spread evenly
            so nearby candidates get different papers.
          </p>
          {mocks.length === 0 || group.members.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              {group.members.length === 0 ? "Add members first." : "No published mocks yet."}
            </p>
          ) : (
            <form action={shuffleAssignAction} className="mt-3 space-y-3">
              <input type="hidden" name="groupId" value={group.id} />
              <div className="grid max-h-56 gap-2 overflow-auto sm:grid-cols-2">
                {mocks.map((mock) => (
                  <label key={mock.id} className={checkboxRow}>
                    <input
                      type="checkbox"
                      name="mockExamId"
                      value={mock.id}
                      className="rounded text-brand-600"
                    />
                    <span className="truncate">{mock.title}</span>
                  </label>
                ))}
              </div>
              <Button type="submit" variant="secondary" size="sm">
                <Shuffle className="h-4 w-4" /> Shuffle &amp; assign
              </Button>
            </form>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-foreground">Members ({group.members.length})</h2>
        {group.members.length === 0 ? (
          <p className="text-sm text-muted">No members yet.</p>
        ) : (
          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.candidateId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.candidate.name ?? member.candidate.email}
                  </p>
                  <p className="truncate text-xs text-muted">{member.candidate.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {(perCandidateMocks.get(member.candidateId) ?? []).map((title, i) => (
                    <Badge key={i} variant="default">
                      {title}
                    </Badge>
                  ))}
                  <form action={removeGroupMemberAction}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="candidateId" value={member.candidateId} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                    >
                      <X className="h-3.5 w-3.5" /> Remove
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
          <UserPlus className="h-4 w-4 text-brand-600" /> Add members
        </h2>
        {nonMembers.length === 0 ? (
          <p className="text-sm text-muted">Every candidate is already in this group.</p>
        ) : (
          <form action={addGroupMembersAction} className="space-y-3">
            <input type="hidden" name="groupId" value={group.id} />
            <div className="grid max-h-72 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
              {nonMembers.map((candidate) => (
                <label key={candidate.id} className={checkboxRow}>
                  <input
                    type="checkbox"
                    name="candidateId"
                    value={candidate.id}
                    className="rounded text-brand-600"
                  />
                  <span className="truncate">{candidate.name ?? candidate.email}</span>
                </label>
              ))}
            </div>
            <Button type="submit" variant="secondary" size="sm">
              <UserPlus className="h-4 w-4" /> Add selected
            </Button>
          </form>
        )}
      </Card>
    </PageShell>
  );
}
