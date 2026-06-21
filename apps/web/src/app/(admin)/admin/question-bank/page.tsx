import Link from "next/link";
import { Copy, Library, Trash2, Wand2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import {
  CONTENT_LABELS,
  CONTENT_TYPES,
  listLibrary,
  type ContentType,
  type SectionKindLiteral
} from "@/lib/question-bank";
import {
  cloneLibraryItemAction,
  generateMockAction,
  removeFromLibraryAction
} from "@/lib/question-bank-actions";

export const metadata = { title: "Question Bank" };
export const dynamic = "force-dynamic";

const fieldClass =
  "h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const typeVariant: Record<ContentType, "default" | "brand" | "success" | "warning"> = {
  PASSAGE: "default",
  AUDIO: "brand",
  QUESTION_GROUP: "success",
  WRITING_TASK: "warning"
};

function pageHref(params: {
  type: string;
  category: string;
  difficulty: string;
  q: string;
  page: number;
}): string {
  const sp = new URLSearchParams();
  if (params.type) sp.set("type", params.type);
  if (params.category) sp.set("category", params.category);
  if (params.difficulty) sp.set("difficulty", params.difficulty);
  if (params.q) sp.set("q", params.q);
  if (params.page > 1) sp.set("page", String(params.page));
  const query = sp.toString();
  return query ? `/admin/question-bank?${query}` : "/admin/question-bank";
}

export default async function AdminQuestionBankPage({
  searchParams
}: {
  searchParams: Promise<{
    type?: string;
    category?: string;
    difficulty?: string;
    q?: string;
    page?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;
  const typeFilter = first(sp.type);
  const categoryFilter = first(sp.category);
  const difficultyFilter = first(sp.difficulty);
  const qFilter = first(sp.q).trim();
  const showEmptyError = first(sp.error) === "empty";

  const session = await auth();
  const me = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;
  const orgId = me?.orgId ?? "";

  const result = await listLibrary({
    orgId,
    contentType: typeFilter,
    category: categoryFilter,
    difficulty: difficultyFilter,
    q: qFilter,
    page: Number(first(sp.page)) || 1
  });

  const editableExams = await prisma.exam.findMany({
    where: { orgId, frozen: false, status: { in: ["DRAFT", "IN_REVIEW", "PREVIEW", "APPROVED"] } },
    select: {
      id: true,
      title: true,
      sections: { select: { id: true, kind: true }, orderBy: { order: "asc" } }
    },
    orderBy: { updatedAt: "desc" }
  });

  const sectionTargets = editableExams.flatMap((exam) =>
    exam.sections.map((s) => ({
      sectionId: s.id,
      kind: s.kind as SectionKindLiteral,
      label: `${exam.title} · ${s.kind}`
    }))
  );

  const libraryEmpty = CONTENT_TYPES.every((t) => result.counts[t] === 0);
  const hasFilters = Boolean(typeFilter || categoryFilter || difficultyFilter || qFilter);
  const firstRow = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const lastRow = Math.min(result.page * result.pageSize, result.total);

  return (
    <PageShell
      title="Question Bank"
      subtitle="Reusable passages, audio, question groups and writing tasks — search, clone into exams, or generate a randomized mock."
    >
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((t) => (
            <Badge key={t} variant={result.counts[t] > 0 ? typeVariant[t] : "muted"}>
              {CONTENT_LABELS[t]}: {result.counts[t]}
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="border-dashed p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-foreground">
          <Wand2 className="h-4 w-4 text-brand-500" /> Randomized mock generator
        </h2>
        <p className="mb-3 text-sm text-muted">
          Builds a new DRAFT exam by cloning random library items. Edit and publish it from the
          exam builder.
        </p>
        {showEmptyError ? (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            No library content matched those counts. Save some content to the library first.
          </p>
        ) : null}
        <form action={generateMockAction} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <input
              id="title"
              name="title"
              placeholder="Randomized mock"
              className={cn(fieldClass, "w-56")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="moduleType">Module</Label>
            <select id="moduleType" name="moduleType" defaultValue="ACADEMIC" className={fieldClass}>
              <option value="ACADEMIC">Academic</option>
              <option value="GENERAL">General Training</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="listeningGroups">Listening groups</Label>
            <input
              id="listeningGroups"
              name="listeningGroups"
              type="number"
              min={0}
              max={10}
              defaultValue={0}
              className={cn(fieldClass, "w-28")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="readingGroups">Reading groups</Label>
            <input
              id="readingGroups"
              name="readingGroups"
              type="number"
              min={0}
              max={10}
              defaultValue={0}
              className={cn(fieldClass, "w-28")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="writingTasks">Writing tasks</Label>
            <input
              id="writingTasks"
              name="writingTasks"
              type="number"
              min={0}
              max={2}
              defaultValue={0}
              className={cn(fieldClass, "w-28")}
            />
          </div>
          <Button type="submit">
            <Wand2 className="h-4 w-4" /> Generate
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              name="type"
              defaultValue={typeFilter}
              className={cn(fieldClass, "min-w-40")}
            >
              <option value="">All types</option>
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CONTENT_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              defaultValue={categoryFilter}
              className={cn(fieldClass, "min-w-36")}
            >
              <option value="">All</option>
              {result.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="difficulty">Difficulty</Label>
            <select
              id="difficulty"
              name="difficulty"
              defaultValue={difficultyFilter}
              className={cn(fieldClass, "min-w-36")}
            >
              <option value="">All</option>
              {result.difficulties.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q">Search</Label>
            <input
              id="q"
              name="q"
              defaultValue={qFilter}
              placeholder="text in content…"
              className={cn(fieldClass, "w-56")}
            />
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          {hasFilters ? (
            <Link
              href="/admin/question-bank"
              className="text-sm text-muted underline-offset-4 hover:text-brand-700 hover:underline"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </Card>

      {libraryEmpty ? (
        <Card className="flex items-start gap-3 p-8 text-sm text-muted">
          <Library className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
          <div>
            <p className="font-medium text-foreground">The library is empty.</p>
            <p className="mt-1">
              Open any exam in the{" "}
              <Link href="/admin/exams" className="text-brand-600 hover:underline">
                exam builder
              </Link>{" "}
              and use <strong>Save to library</strong> on a passage, question group, or writing task
              to make it reusable here.
            </p>
          </div>
        </Card>
      ) : result.rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No items match these filters.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {result.rows.map((row) => {
            const targets = sectionTargets.filter((t) => t.kind === row.compatibleKind);
            return (
              <Card key={row.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{row.title}</p>
                    <p className="text-xs text-muted">{row.meta}</p>
                  </div>
                  <Badge variant={typeVariant[row.contentType]}>
                    {CONTENT_LABELS[row.contentType]}
                  </Badge>
                </div>

                {row.preview ? (
                  <p className="line-clamp-2 text-sm text-muted">{row.preview}</p>
                ) : null}

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {row.category ? <Badge variant="muted">{row.category}</Badge> : null}
                  {row.difficulty ? <Badge variant="muted">{row.difficulty}</Badge> : null}
                  {row.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-600">
                      #{tag}
                    </span>
                  ))}
                  <span className="ml-auto text-muted">reused {row.reuseCount}×</span>
                </div>

                <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
                  {targets.length > 0 ? (
                    <form action={cloneLibraryItemAction} className="flex flex-1 items-center gap-2">
                      <input type="hidden" name="libraryItemId" value={row.id} />
                      <select
                        name="targetSectionId"
                        className={cn(fieldClass, "h-9 min-w-0 flex-1 text-xs")}
                        defaultValue={targets[0]?.sectionId}
                      >
                        {targets.map((t) => (
                          <option key={t.sectionId} value={t.sectionId}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        <Copy className="h-3.5 w-3.5" /> Clone
                      </Button>
                    </form>
                  ) : (
                    <span className="flex-1 text-xs text-muted">
                      No editable {row.compatibleKind} section to clone into
                    </span>
                  )}
                  <form action={removeFromLibraryAction}>
                    <input type="hidden" name="contentType" value={row.contentType} />
                    <input type="hidden" name="refId" value={row.refId} />
                    <Button type="submit" size="icon" variant="ghost" title="Remove from library">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!libraryEmpty && result.total > 0 ? (
        <Card className="flex items-center justify-between p-4 text-sm text-muted">
          <span>
            Showing {firstRow}–{lastRow} of {result.total}
          </span>
          <div className="flex items-center gap-2">
            {result.page > 1 ? (
              <Link
                href={pageHref({
                  type: typeFilter,
                  category: categoryFilter,
                  difficulty: difficultyFilter,
                  q: qFilter,
                  page: result.page - 1
                })}
              >
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
              Page {result.page} of {result.totalPages}
            </span>
            {result.page < result.totalPages ? (
              <Link
                href={pageHref({
                  type: typeFilter,
                  category: categoryFilter,
                  difficulty: difficultyFilter,
                  q: qFilter,
                  page: result.page + 1
                })}
              >
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
        </Card>
      ) : null}
    </PageShell>
  );
}
