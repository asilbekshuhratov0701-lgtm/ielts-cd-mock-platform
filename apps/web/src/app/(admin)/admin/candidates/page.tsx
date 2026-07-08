import Link from "next/link";
import { Boxes, Pencil, Trash2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CandidateImportPanel } from "@/components/candidates/CandidateImportPanel";
import { ExportMenu } from "@/components/candidates/ExportMenu";
import { createCandidateAction, resetPasswordAction, setStatusAction } from "@/lib/admin-users-actions";
import { updateCandidateAction, deleteCandidateAction } from "@/lib/candidate-admin-actions";

export const metadata = { title: "Candidates" };

const fieldLabel = "text-xs font-medium text-muted";

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

  const candidates = await prisma.user.findMany({
    where: { orgId, role: "CANDIDATE" },
    include: {
      candidateProfile: true,
      groupMemberships: { select: { group: { select: { id: true, name: true } } } },
      _count: { select: { mockAttempts: true } }
    },
    orderBy: { createdAt: "desc" }
  });

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
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <Card key={candidate.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{candidate.name ?? candidate.email}</p>
                    <Badge variant={candidate.status === "ACTIVE" ? "success" : "danger"}>
                      {candidate.status}
                    </Badge>
                    {candidate.groupMemberships.map((m) => (
                      <Badge key={m.group.id} variant="muted">
                        {m.group.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {candidate.email} · {candidate._count.mockAttempts} mock attempt
                    {candidate._count.mockAttempts === 1 ? "" : "s"}
                    {candidate.candidateProfile?.phone ? ` · ${candidate.candidateProfile.phone}` : ""}
                    {candidate.candidateProfile?.targetBand
                      ? ` · target ${candidate.candidateProfile.targetBand}`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ExportMenu
                    endpoint="results"
                    params={{ candidateId: candidate.id }}
                    label="Results"
                  />
                  <form action={resetPasswordAction} className="flex items-center gap-1.5">
                    <input type="hidden" name="userId" value={candidate.id} />
                    <Input
                      name="password"
                      type="text"
                      minLength={8}
                      placeholder="new password"
                      className="h-9 w-32"
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      Reset
                    </Button>
                  </form>
                  <form action={setStatusAction}>
                    <input type="hidden" name="userId" value={candidate.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={candidate.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      {candidate.status === "ACTIVE" ? "Suspend" : "Activate"}
                    </Button>
                  </form>
                </div>
              </div>

              <details className="mt-3 border-t border-border pt-3">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-brand-600 [&::-webkit-details-marker]:hidden">
                  <Pencil className="h-3.5 w-3.5" /> Edit profile
                </summary>
                <form action={updateCandidateAction} className="mt-3 grid gap-3 sm:grid-cols-3">
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <label className="space-y-1">
                    <span className={fieldLabel}>Name</span>
                    <Input name="name" defaultValue={candidate.name ?? ""} />
                  </label>
                  <label className="space-y-1">
                    <span className={fieldLabel}>Email</span>
                    <Input name="email" type="email" defaultValue={candidate.email} />
                  </label>
                  <label className="space-y-1">
                    <span className={fieldLabel}>Phone</span>
                    <Input name="phone" defaultValue={candidate.candidateProfile?.phone ?? ""} />
                  </label>
                  <label className="space-y-1">
                    <span className={fieldLabel}>Country</span>
                    <Input name="country" defaultValue={candidate.candidateProfile?.country ?? ""} />
                  </label>
                  <label className="space-y-1">
                    <span className={fieldLabel}>Target band</span>
                    <Input
                      name="targetBand"
                      inputMode="decimal"
                      defaultValue={candidate.candidateProfile?.targetBand?.toString() ?? ""}
                    />
                  </label>
                  <div className="flex items-end">
                    <Button type="submit" size="sm" variant="secondary">
                      Save changes
                    </Button>
                  </div>
                </form>
                <form action={deleteCandidateAction} className="mt-2">
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" /> Delete candidate
                  </Button>
                </form>
              </details>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
