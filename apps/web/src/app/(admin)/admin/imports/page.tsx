import Link from "next/link";
import { FileText, Sparkles, Upload } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteImportAction, importExamAction } from "@/lib/ai-import-actions";

export const metadata = { title: "AI Import" };

const ERROR_MESSAGES: Record<string, string> = {
  nofile: "Please choose a PDF file to upload.",
  notpdf: "Only PDF files are supported.",
  failed:
    "Import failed — the file could not be parsed or the AI request errored. Check the job log."
};

function statusVariant(status: string): "success" | "warning" | "danger" | "muted" | "brand" {
  if (status === "PUBLISHED") return "success";
  if (status === "NEEDS_REVIEW") return "brand";
  if (status === "FAILED") return "danger";
  if (status === "ANALYZING" || status === "PARSING") return "warning";
  return "muted";
}

export default async function AdminImportsPage({
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
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY) && process.env.AI_PROVIDER !== "mock";

  const jobs = await prisma.importJob.findMany({
    where: { orgId },
    include: { examDraft: { select: { id: true, title: true, status: true } } },
    orderBy: { createdAt: "desc" },
    take: 30
  });

  return (
    <PageShell
      title="AI Exam Import"
      subtitle="Upload an IELTS exam PDF — AI converts it into a Computer-Delivered mock exam."
    >
      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {ERROR_MESSAGES[error] ?? "Something went wrong."}
        </div>
      ) : null}

      {!hasApiKey ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Running in <strong>mock mode</strong> — set <code>ANTHROPIC_API_KEY</code> in{" "}
            <code>apps/web/.env</code> for real AI extraction. Mock mode still creates a draft you
            can edit.
          </span>
        </div>
      ) : null}

      <Card className="p-6">
        <h2 className="mb-1 font-semibold text-foreground">Upload exam PDF</h2>
        <p className="mb-4 text-sm text-muted">
          The AI identifies sections, question types, options and (when present in the file) the
          answer key. It lands as a <strong>draft</strong> for you to review and publish.
        </p>
        <form action={importExamAction} className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="file"
            accept="application/pdf,.pdf"
            required
            className="block text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
          />
          <Button type="submit">
            <Upload className="h-4 w-4" /> Import &amp; convert
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted">
          Conversion can take 10–40 seconds for a full exam.
        </p>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground/70">Recent imports</h2>
        {jobs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted">No imports yet.</Card>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const log = (job.logJson ?? {}) as { filename?: string; error?: string };
              return (
                <Card
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {log.filename ?? "Imported file"}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {job.createdAt.toLocaleString()}
                        {log.error ? ` · ${log.error}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                    {job.examDraft ? (
                      <Link href={`/admin/exams/${job.examDraft.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Review draft
                        </Button>
                      </Link>
                    ) : null}
                    <form action={deleteImportAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Delete
                      </Button>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
