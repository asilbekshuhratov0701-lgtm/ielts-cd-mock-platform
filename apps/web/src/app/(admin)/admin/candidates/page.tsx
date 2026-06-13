import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  assignExamAction,
  createCandidateAction,
  resetPasswordAction,
  setStatusAction
} from "@/lib/admin-users-actions";

export const metadata = { title: "Candidates" };

const selectClass =
  "h-9 rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

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

  const [candidates, exams] = await Promise.all([
    prisma.user.findMany({
      where: { orgId, role: "CANDIDATE" },
      include: {
        candidateProfile: true,
        _count: { select: { attempts: true, assignments: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.exam.findMany({
      where: { orgId, status: "PUBLISHED" },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <PageShell title="Candidates" subtitle="Create candidates, assign exams, and reset passwords.">
      {error === "email" ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          A user with that email already exists.
        </div>
      ) : null}

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-foreground">Add candidate</h2>
        <form action={createCandidateAction} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Jane Candidate" className="w-48" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="jane@example.com"
              className="w-56"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Temp password</Label>
            <Input
              id="password"
              name="password"
              type="text"
              required
              minLength={8}
              placeholder="min 8 chars"
              className="w-44"
            />
          </div>
          <Button type="submit">Create</Button>
        </form>
      </Card>

      {candidates.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No candidates yet.</Card>
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <Card key={candidate.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">
                      {candidate.name ?? candidate.email}
                    </p>
                    <Badge variant={candidate.status === "ACTIVE" ? "success" : "danger"}>
                      {candidate.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted">
                    {candidate.email} · {candidate._count.attempts} attempts ·{" "}
                    {candidate._count.assignments} assigned
                    {candidate.candidateProfile?.targetBand
                      ? ` · target ${candidate.candidateProfile.targetBand}`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {exams.length > 0 ? (
                    <form action={assignExamAction} className="flex items-center gap-2">
                      <input type="hidden" name="candidateId" value={candidate.id} />
                      <select name="examId" className={selectClass} defaultValue={exams[0]?.id}>
                        {exams.map((exam) => (
                          <option key={exam.id} value={exam.id}>
                            {exam.title}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="outline" size="sm">
                        Assign
                      </Button>
                    </form>
                  ) : (
                    <span className="text-xs text-muted">No published exams</span>
                  )}

                  <form action={resetPasswordAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={candidate.id} />
                    <Input
                      name="password"
                      type="text"
                      minLength={8}
                      placeholder="new password"
                      className="h-9 w-36"
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
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
