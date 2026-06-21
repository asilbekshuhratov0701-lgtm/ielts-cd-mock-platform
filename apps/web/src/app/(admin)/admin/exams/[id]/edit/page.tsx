import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookmarkMinus, BookmarkPlus, Plus, Send, Trash2 } from "lucide-react";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  addGroupAction,
  addPassageAction,
  addQuestionAction,
  addSectionAction,
  addWritingTaskAction,
  deleteGroupAction,
  deleteQuestionAction,
  deleteSectionAction,
  publishExamAction,
  updateExamAction
} from "@/lib/admin-exam-actions";
import { removeFromLibraryAction, saveToLibraryAction } from "@/lib/question-bank-actions";
import type { ContentType } from "@/lib/question-bank";

function LibraryControls({
  examId,
  contentType,
  refId,
  isLibrary
}: {
  examId: string;
  contentType: ContentType;
  refId: string;
  isLibrary: boolean;
}) {
  if (isLibrary) {
    return (
      <form action={removeFromLibraryAction} className="mt-2 flex items-center gap-2">
        <input type="hidden" name="examId" value={examId} />
        <input type="hidden" name="contentType" value={contentType} />
        <input type="hidden" name="refId" value={refId} />
        <Badge variant="success">In library</Badge>
        <Button type="submit" variant="ghost" size="sm">
          <BookmarkMinus className="h-3.5 w-3.5" /> Remove from library
        </Button>
      </form>
    );
  }
  return (
    <details className="mt-2">
      <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline">
        <BookmarkPlus className="h-3.5 w-3.5" /> Save to library
      </summary>
      <form
        action={saveToLibraryAction}
        className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border p-2"
      >
        <input type="hidden" name="examId" value={examId} />
        <input type="hidden" name="contentType" value={contentType} />
        <input type="hidden" name="refId" value={refId} />
        <input name="category" placeholder="Category" className={`${libField} w-32`} />
        <input name="difficulty" placeholder="Difficulty" className={`${libField} w-32`} />
        <input name="tags" placeholder="tags, comma-separated" className={`${libField} w-48`} />
        <Button type="submit" variant="secondary" size="sm">
          Save
        </Button>
      </form>
    </details>
  );
}

const libField =
  "h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";

const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "MULTIPLE_ANSWER",
  "TRUE_FALSE_NOT_GIVEN",
  "YES_NO_NOT_GIVEN",
  "MATCHING_HEADINGS",
  "MATCHING_INFORMATION",
  "MATCHING_FEATURES",
  "MATCHING_SENTENCE_ENDINGS",
  "SENTENCE_COMPLETION",
  "SUMMARY_COMPLETION",
  "NOTE_COMPLETION",
  "TABLE_COMPLETION",
  "FLOW_CHART_COMPLETION",
  "DIAGRAM_LABELLING",
  "MAP_LABELLING",
  "PLAN_LABELLING",
  "SHORT_ANSWER",
  "CLASSIFICATION"
];
const ANSWER_TYPES = ["SINGLE", "MULTI", "TEXT", "DROPDOWN", "MATCH"];
const MATCH_MODES = ["EXACT", "CONTAINS", "REGEX", "SET"];

const field =
  "h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";
const area =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";
const statusVariant: Record<string, "warning" | "success" | "muted"> = {
  DRAFT: "warning",
  PUBLISHED: "success",
  ARCHIVED: "muted"
};

export default async function AdminExamEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          passages: { orderBy: { order: "asc" } },
          writingTasks: { orderBy: { taskNo: "asc" } },
          questionGroups: {
            orderBy: { order: "asc" },
            include: {
              questions: {
                orderBy: { number: "asc" },
                include: { options: { orderBy: { order: "asc" } }, answerKey: true }
              }
            }
          }
        }
      }
    }
  });
  if (!exam) notFound();

  return (
    <PageShell
      title="Exam builder"
      subtitle="Add sections, passages, questions and answer keys, then publish."
      actions={
        <form action={publishExamAction}>
          <input type="hidden" name="examId" value={exam.id} />
          <Button type="submit" variant="success">
            <Send className="h-4 w-4" /> Publish exam
          </Button>
        </form>
      }
    >
      <Link
        href="/admin/exams"
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to exams
      </Link>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-semibold text-foreground">Exam details</h2>
          <Badge variant={statusVariant[exam.status] ?? "muted"}>{exam.status}</Badge>
        </div>
        <form action={updateExamAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="examId" value={exam.id} />
          <label className="text-xs text-muted">
            Title
            <input name="title" defaultValue={exam.title} className={`${field} mt-1 w-72`} />
          </label>
          <label className="text-xs text-muted">
            Module
            <select name="moduleType" defaultValue={exam.moduleType} className={`${field} mt-1`}>
              <option value="ACADEMIC">Academic</option>
              <option value="GENERAL">General Training</option>
            </select>
          </label>
          <Button type="submit" variant="outline">
            Save
          </Button>
        </form>
      </Card>

      {exam.sections.map((section) => (
        <Card key={section.id} className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Badge variant="default">{section.kind}</Badge>
              <span className="text-sm text-muted">{Math.round(section.durationSec / 60)} min</span>
            </h2>
            <form action={deleteSectionAction}>
              <input type="hidden" name="examId" value={exam.id} />
              <input type="hidden" name="sectionId" value={section.id} />
              <Button type="submit" variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" /> Delete section
              </Button>
            </form>
          </div>

          {section.kind === "READING" ? (
            <div className="mb-4 space-y-2">
              {section.passages.map((p) => (
                <div key={p.id} className="rounded-lg bg-brand-50/40 p-3 text-sm">
                  <p className="font-medium text-brand-700">{p.title ?? "Untitled passage"}</p>
                  <p className="line-clamp-2 text-muted">{p.bodyRichtext}</p>
                  <LibraryControls
                    examId={exam.id}
                    contentType="PASSAGE"
                    refId={p.id}
                    isLibrary={p.isLibrary}
                  />
                </div>
              ))}
              <form
                action={addPassageAction}
                className="space-y-2 rounded-lg border border-dashed border-border p-3"
              >
                <input type="hidden" name="examId" value={exam.id} />
                <input type="hidden" name="sectionId" value={section.id} />
                <input name="title" placeholder="Passage title" className={field} />
                <textarea name="body" rows={3} placeholder="Passage text…" className={area} />
                <Button type="submit" size="sm">
                  <Plus className="h-4 w-4" /> Add passage
                </Button>
              </form>
            </div>
          ) : null}

          {section.kind === "WRITING" ? (
            <div className="mb-4 space-y-2">
              {section.writingTasks.map((t) => (
                <div key={t.id} className="rounded-lg bg-brand-50/40 p-3 text-sm">
                  <p className="font-medium text-brand-700">
                    Task {t.taskNo} · min {t.minWords} words
                  </p>
                  <p className="line-clamp-2 text-muted">{t.promptRichtext}</p>
                  <LibraryControls
                    examId={exam.id}
                    contentType="WRITING_TASK"
                    refId={t.id}
                    isLibrary={t.isLibrary}
                  />
                </div>
              ))}
              <form
                action={addWritingTaskAction}
                className="space-y-2 rounded-lg border border-dashed border-border p-3"
              >
                <input type="hidden" name="examId" value={exam.id} />
                <input type="hidden" name="sectionId" value={section.id} />
                <div className="flex gap-2">
                  <input
                    name="taskNo"
                    type="number"
                    min={1}
                    max={2}
                    placeholder="Task #"
                    className={field}
                  />
                  <input
                    name="minWords"
                    type="number"
                    min={50}
                    defaultValue={150}
                    placeholder="Min words"
                    className={field}
                  />
                </div>
                <textarea name="prompt" rows={3} placeholder="Writing prompt…" className={area} />
                <Button type="submit" size="sm">
                  <Plus className="h-4 w-4" /> Add writing task
                </Button>
              </form>
            </div>
          ) : null}

          {section.kind !== "WRITING" ? (
            <div className="space-y-3">
              {section.questionGroups.map((group) => (
                <div key={group.id} className="rounded-xl border border-border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="muted">{group.type}</Badge>
                    <form action={deleteGroupAction}>
                      <input type="hidden" name="examId" value={exam.id} />
                      <input type="hidden" name="groupId" value={group.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" /> Delete group
                      </Button>
                    </form>
                  </div>
                  <p className="mb-1 text-xs text-muted">{group.instructionsRichtext}</p>
                  <LibraryControls
                    examId={exam.id}
                    contentType="QUESTION_GROUP"
                    refId={group.id}
                    isLibrary={group.isLibrary}
                  />

                  <ul className="mb-3 mt-3 space-y-1.5 text-sm">
                    {group.questions.map((q) => (
                      <li key={q.id} className="flex items-start justify-between gap-2">
                        <span className="text-foreground">
                          <span className="font-semibold text-brand-700">{q.number}.</span>{" "}
                          {q.prompt}
                          {q.answerKey ? (
                            <span className="ml-2 text-xs text-emerald-700">
                              key: {(q.answerKey.acceptedJson as string[]).join(", ")}
                            </span>
                          ) : null}
                        </span>
                        <form action={deleteQuestionAction}>
                          <input type="hidden" name="examId" value={exam.id} />
                          <input type="hidden" name="questionId" value={q.id} />
                          <Button type="submit" variant="ghost" size="icon" title="Delete question">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>

                  <form
                    action={addQuestionAction}
                    className="space-y-2 rounded-lg border border-dashed border-border p-3"
                  >
                    <input type="hidden" name="examId" value={exam.id} />
                    <input type="hidden" name="groupId" value={group.id} />
                    <div className="flex gap-2">
                      <input
                        name="number"
                        type="number"
                        min={1}
                        placeholder="No."
                        className={`${field} w-20`}
                      />
                      <input
                        name="prompt"
                        placeholder="Question prompt"
                        className={field}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <select name="answerType" className={field} defaultValue="TEXT">
                        {ANSWER_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <select name="matchMode" className={field} defaultValue="EXACT">
                        {MATCH_MODES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      name="options"
                      rows={2}
                      placeholder={'Options (one per line, "value|label") — for choice types'}
                      className={area}
                    />
                    <input
                      name="accepted"
                      placeholder="Accepted answers (comma-separated) — the answer key"
                      className={field}
                    />
                    <Button type="submit" size="sm">
                      <Plus className="h-4 w-4" /> Add question
                    </Button>
                  </form>
                </div>
              ))}

              <form
                action={addGroupAction}
                className="space-y-2 rounded-lg border border-dashed border-border p-3"
              >
                <input type="hidden" name="examId" value={exam.id} />
                <input type="hidden" name="sectionId" value={section.id} />
                <div className="flex gap-2">
                  <select name="type" className={field} defaultValue="MULTIPLE_CHOICE">
                    {QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {section.kind === "READING" && section.passages.length > 0 ? (
                    <select name="passageId" className={field} defaultValue="">
                      <option value="">(no passage)</option>
                      {section.passages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title ?? "Passage"}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                <input
                  name="instructions"
                  placeholder="Group instructions"
                  className={field}
                  required
                />
                <Button type="submit" size="sm">
                  <Plus className="h-4 w-4" /> Add question group
                </Button>
              </form>
            </div>
          ) : null}
        </Card>
      ))}

      <Card className="border-dashed p-5">
        <h2 className="mb-3 font-semibold text-foreground">Add section</h2>
        <form action={addSectionAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="examId" value={exam.id} />
          <label className="text-xs text-muted">
            Section
            <select name="kind" className={`${field} mt-1`} defaultValue="LISTENING">
              <option value="LISTENING">Listening</option>
              <option value="READING">Reading</option>
              <option value="WRITING">Writing</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Duration (min)
            <input
              name="durationMin"
              type="number"
              min={1}
              defaultValue={30}
              className={`${field} mt-1`}
            />
          </label>
          <Button type="submit">
            <Plus className="h-4 w-4" /> Add section
          </Button>
        </form>
      </Card>
    </PageShell>
  );
}
