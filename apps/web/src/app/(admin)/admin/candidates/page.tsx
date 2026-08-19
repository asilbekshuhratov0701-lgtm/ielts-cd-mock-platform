import Link from "next/link";
import { Boxes } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { CandidateImportPanel } from "@/components/candidates/CandidateImportPanel";
import { CandidateList, type CandidateRow } from "@/components/candidates/CandidateList";
import { ExportMenu } from "@/components/candidates/ExportMenu";
import { createCandidateAction } from "@/lib/admin-users-actions";

export const metadata = { title: "Candidates" };

export default async function AdminCandidatesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const orgId = me?.orgId ?? "";

  const rows = await prisma.user.findMany({
    where: { orgId, role: "CANDIDATE" },
    include: {
      candidateProfile: true,
      groupMemberships: { select: { group: { select: { id: true, name: true } } } },
      _count: { select: { mockAttempts: true, blueprintAttempts: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const candidates: CandidateRow[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    status: c.status,
    phone: c.candidateProfile?.phone ?? null,
    country: c.candidateProfile?.country ?? null,
    targetBand: c.candidateProfile?.targetBand ?? null,
    groups: c.groupMemberships.map((m) => m.group),
    mockAttempts: c._count.mockAttempts,
    sectionAttempts: c._count.blueprintAttempts
  }));

  return (
    <PageShell
      title="Candidates"
      subtitle="Import lists, manage profiles, and export results."
      actions={
        <div className="flex items-center gap-2">
          <Link href="/admin/groups">
            <Button variant="outline" size="sm">
              <Boxes className="h-4 w-4" /> Groups
            </Button>
          </Link>
          {candidates.length > 0 ? (
            <ExportMenu endpoint="results" params={{}} label="Export results" />
          ) : null}
        </div>
      }
    >
      {error === "email" ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          A user with that email already exists.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-foreground">Bulk import</h2>
          <CandidateImportPanel />
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold text-foreground">Add one candidate</h2>
          <form action={createCandidateAction} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Jane Candidate" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="jane@example.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Temp password</Label>
              <Input id="password" name="password" type="text" required minLength={8} placeholder="min 8 chars" />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Create candidate
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {candidates.length} candidate{candidates.length === 1 ? "" : "s"}
        </h2>
      </div>

      {candidates.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No candidates yet.</Card>
      ) : (
        <CandidateList candidates={candidates} />
      )}
    </PageShell>
  );
}
