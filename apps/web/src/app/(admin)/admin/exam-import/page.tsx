import Link from "next/link";
import { ChevronRight, Layers, PenLine, Plus } from "lucide-react";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExamImporter } from "@/components/exam-import/ExamImporter";
import { createWritingExamAction } from "@/lib/exam-blueprint-actions";
import { createMockAction } from "@/lib/mock-actions";
import { MODULE_ORDER } from "@/lib/mock";

const stateVariant: Record<string, "default" | "warning" | "success"> = {
  draft: "default",
  audio_pending: "warning",
  published: "success"
};

const errorText: Record<string, string> = {
  empty: "No JSON was submitted.",
  parse: "The file was not valid JSON.",
  invalid: "The exam did not pass validation — fix the errors and try again.",
  mock_incomplete: "Give the mock a title and pick at least one part.",
  writing_incomplete: "Give the writing exam a title and both task topics.",
  writing_invalid: "Could not create the writing exam — please try again."
};

const field =
  "h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground";
const textArea =
  "w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

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
  const mocks = dbUser
    ? await prisma.mockExam.findMany({
        where: { orgId: dbUser.orgId },
        include: { parts: true },
        orderBy: { createdAt: "desc" }
      })
    : [];

  const byModule = (m: string) => blueprints.filter((b) => b.module === m);

  return (
    <PageShell
      title="Exam builder"
      subtitle="Upload per-skill exam JSON (Reading / Listening / Writing), attach Listening audio, then assemble them into a full mock candidates sit end-to-end."
    >
      {error ? (
        <Card className="border-red-200 p-3 text-sm text-red-700">
          {errorText[error] ?? "Import failed."}
        </Card>
      ) : null}

      <ExamImporter />

      <Card className="p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-foreground">
          <PenLine className="h-4 w-4 text-brand-600" /> Create a writing exam
        </h2>
        <p className="mb-4 text-sm text-muted">
          No JSON needed. Add a Task 1 topic with a chart/diagram image, and a Task 2 topic. Creates
          a Writing exam you can add to a full mock below.
        </p>
        <form action={createWritingExamAction} className="space-y-4">
          <input type="text" name="title" placeholder="Title (e.g. Writing – Test 4)" className={field} required />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Task 1 — topic + image
              </span>
              <textarea
                name="task1"
                rows={4}
                required
                placeholder="The chart below shows… Summarise the information…"
                className={textArea}
              />
              <input
                type="file"
                name="task1Image"
                accept="image/*"
                className={`${field} file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-brand-700`}
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Task 2 — topic
              </span>
              <textarea
                name="task2"
                rows={4}
                required
                placeholder="Some people believe… To what extent do you agree or disagree?"
                className={textArea}
              />
            </div>
          </div>
          <Button type="submit" variant="secondary">
            <PenLine className="h-4 w-4" /> Create writing exam
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-foreground">Uploaded parts</h2>
        {blueprints.length === 0 ? (
          <p className="text-sm text-muted">No parts yet. Upload a Reading or Listening JSON above.</p>
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

      <Card className="p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-foreground">
          <Layers className="h-4 w-4 text-brand-600" /> Assemble a full mock
        </h2>
        <p className="mb-4 text-sm text-muted">
          Pick one uploaded part per skill. The mock can be published once every chosen part is
          published (Listening needs its audio attached first).
        </p>
        <form action={createMockAction} className="space-y-3">
          <input
            type="text"
            name="title"
            placeholder="Mock title (e.g. IELTS Full Mock 1)"
            className={field}
            required
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {MODULE_ORDER.map((m) => (
              <label key={m} className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  {m}
                </span>
                <select name={`part_${m}`} className={field} defaultValue="">
                  <option value="">— none —</option>
                  {byModule(m).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} · v{b.version} · {b.state}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <Button type="submit" variant="secondary">
            <Plus className="h-4 w-4" /> Create mock
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-foreground">Full mocks</h2>
        {mocks.length === 0 ? (
          <p className="text-sm text-muted">No mocks yet. Assemble one from the parts above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {mocks.map((mock) => (
              <li key={mock.id}>
                <Link
                  href={`/admin/exam-import/mock/${mock.id}`}
                  className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-brand-50/40"
                >
                  <span className="min-w-0">
                    <span className="truncate font-medium text-foreground">{mock.title}</span>
                    <span className="ml-2 text-xs text-muted">
                      {mock.parts.map((p) => p.module).join(" · ") || "no parts"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant={stateVariant[mock.state] ?? "default"}>{mock.state}</Badge>
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
