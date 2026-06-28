import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExamImporter } from "@/components/exam-import/ExamImporter";

const stateVariant: Record<string, "default" | "warning" | "success"> = {
  draft: "default",
  audio_pending: "warning",
  published: "success"
};

const errorText: Record<string, string> = {
  empty: "No JSON was submitted.",
  parse: "The file was not valid JSON.",
  invalid: "The exam did not pass validation — fix the errors and try again."
};

export default async function ExamImportPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const blueprints = dbUser
    ? await prisma.examBlueprint.findMany({
        where: { orgId: dbUser.orgId },
        orderBy: { createdAt: "desc" }
      })
    : [];

  return (
    <PageShell
      title="Exam builder — JSON import"
      subtitle="Upload a per-skill exam JSON (plus a Listening audio file), validate it, preview it in the CD interface, then save and publish."
    >
      {error ? (
        <Card className="border-red-200 p-3 text-sm text-red-700">
          {errorText[error] ?? "Import failed."}
        </Card>
      ) : null}

      <ExamImporter />

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-foreground">Saved exams</h2>
        {blueprints.length === 0 ? (
          <p className="text-sm text-muted">No exams saved yet. Upload a JSON file above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {blueprints.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/admin/exam-import/${b.id}`}
                  className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-brand-50/40"
                >
                  <span className="min-w-0">
                    <span className="truncate font-medium text-foreground">{b.title}</span>
                    <span className="ml-2 text-xs text-muted">
                      {b.module} · v{b.version} · {b.totalQuestions} questions
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant={stateVariant[b.state] ?? "default"}>{b.state}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageShell>
  );
}
