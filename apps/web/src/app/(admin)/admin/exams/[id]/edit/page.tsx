import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
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

const inputClass = "mt-1 block w-full rounded-lg border border-brand-200 px-2 py-1 text-sm";

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
    <PageShell title={`Edit: ${exam.title}`} subtitle={`${exam.moduleType} · ${exam.status}`}>
      <Link href="/admin/exams" className="text-sm text-brand-600 hover:underline">
        ← Back to exams
      </Link>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-100 p-4">
        <form action={updateExamAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="examId" value={exam.id} />
          <label className="text-xs text-foreground/60">
            Title
            <input name="title" defaultValue={exam.title} className={inputClass} />
          </label>
          <label className="text-xs text-foreground/60">
            Module
            <select name="moduleType" defaultValue={exam.moduleType} className={inputClass}>
              <option value="ACADEMIC">Academic</option>
              <option value="GENERAL">General Training</option>
            </select>
          </label>
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Save
          </button>
        </form>
        <form action={publishExamAction} className="ml-auto">
          <input type="hidden" name="examId" value={exam.id} />
          <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            Publish exam
          </button>
        </form>
      </div>

      {exam.sections.map((section) => (
        <section key={section.id} className="rounded-xl border border-brand-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-700">
              {section.kind} · {Math.round(section.durationSec / 60)} min
            </h2>
            <form action={deleteSectionAction}>
              <input type="hidden" name="examId" value={exam.id} />
              <input type="hidden" name="sectionId" value={section.id} />
              <button className="text-xs text-red-600 hover:underline">Delete section</button>
            </form>
          </div>

          {section.kind === "READING" ? (
            <div className="mb-4 space-y-2">
              {section.passages.map((p) => (
                <div key={p.id} className="rounded-lg bg-brand-50/40 p-3 text-sm">
                  <p className="font-medium text-brand-700">{p.title ?? "Untitled passage"}</p>
                  <p className="line-clamp-2 text-foreground/60">{p.bodyRichtext}</p>
                </div>
              ))}
              <form
                action={addPassageAction}
                className="space-y-2 rounded-lg border border-dashed border-brand-200 p-3"
              >
                <input type="hidden" name="examId" value={exam.id} />
                <input type="hidden" name="sectionId" value={section.id} />
                <input name="title" placeholder="Passage title" className={inputClass} />
                <textarea name="body" rows={3} placeholder="Passage text…" className={inputClass} />
                <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">
                  Add passage
                </button>
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
                  <p className="line-clamp-2 text-foreground/60">{t.promptRichtext}</p>
                </div>
              ))}
              <form
                action={addWritingTaskAction}
                className="space-y-2 rounded-lg border border-dashed border-brand-200 p-3"
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
                    className={inputClass}
                  />
                  <input
                    name="minWords"
                    type="number"
                    min={50}
                    defaultValue={150}
                    placeholder="Min words"
                    className={inputClass}
                  />
                </div>
                <textarea
                  name="prompt"
                  rows={3}
                  placeholder="Writing prompt…"
                  className={inputClass}
                />
                <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">
                  Add writing task
                </button>
              </form>
            </div>
          ) : null}

          {section.kind !== "WRITING" ? (
            <div className="space-y-3">
              {section.questionGroups.map((group) => (
                <div key={group.id} className="rounded-lg border border-brand-100 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-brand-700">{group.type}</p>
                    <form action={deleteGroupAction}>
                      <input type="hidden" name="examId" value={exam.id} />
                      <input type="hidden" name="groupId" value={group.id} />
                      <button className="text-xs text-red-600 hover:underline">Delete group</button>
                    </form>
                  </div>
                  <p className="mb-2 text-xs text-foreground/60">{group.instructionsRichtext}</p>

                  <ul className="mb-2 space-y-1 text-sm">
                    {group.questions.map((q) => (
                      <li key={q.id} className="flex items-start justify-between gap-2">
                        <span>
                          <span className="font-semibold text-brand-700">{q.number}.</span>{" "}
                          {q.prompt}
                          {q.answerKey ? (
                            <span className="ml-2 text-xs text-green-700">
                              key: {(q.answerKey.acceptedJson as string[]).join(", ")}
                            </span>
                          ) : null}
                        </span>
                        <form action={deleteQuestionAction}>
                          <input type="hidden" name="examId" value={exam.id} />
                          <input type="hidden" name="questionId" value={q.id} />
                          <button className="text-xs text-red-600 hover:underline">×</button>
                        </form>
                      </li>
                    ))}
                  </ul>

                  <form
                    action={addQuestionAction}
                    className="space-y-2 rounded-lg border border-dashed border-brand-200 p-2"
                  >
                    <input type="hidden" name="examId" value={exam.id} />
                    <input type="hidden" name="groupId" value={group.id} />
                    <div className="flex gap-2">
                      <input
                        name="number"
                        type="number"
                        min={1}
                        placeholder="No."
                        className={`${inputClass} w-20`}
                      />
                      <input
                        name="prompt"
                        placeholder="Question prompt"
                        className={inputClass}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <select name="answerType" className={inputClass} defaultValue="TEXT">
                        {ANSWER_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <select name="matchMode" className={inputClass} defaultValue="EXACT">
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
                      className={inputClass}
                    />
                    <input
                      name="accepted"
                      placeholder="Accepted answers (comma-separated) — the answer key"
                      className={inputClass}
                    />
                    <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">
                      Add question
                    </button>
                  </form>
                </div>
              ))}

              <form
                action={addGroupAction}
                className="space-y-2 rounded-lg border border-dashed border-brand-200 p-3"
              >
                <input type="hidden" name="examId" value={exam.id} />
                <input type="hidden" name="sectionId" value={section.id} />
                <div className="flex gap-2">
                  <select name="type" className={inputClass} defaultValue="MULTIPLE_CHOICE">
                    {QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {section.kind === "READING" && section.passages.length > 0 ? (
                    <select name="passageId" className={inputClass} defaultValue="">
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
                  className={inputClass}
                  required
                />
                <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">
                  Add question group
                </button>
              </form>
            </div>
          ) : null}
        </section>
      ))}

      <form
        action={addSectionAction}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-brand-200 p-4"
      >
        <input type="hidden" name="examId" value={exam.id} />
        <label className="text-xs text-foreground/60">
          Section
          <select name="kind" className={inputClass} defaultValue="LISTENING">
            <option value="LISTENING">Listening</option>
            <option value="READING">Reading</option>
            <option value="WRITING">Writing</option>
          </select>
        </label>
        <label className="text-xs text-foreground/60">
          Duration (min)
          <input
            name="durationMin"
            type="number"
            min={1}
            defaultValue={30}
            className={inputClass}
          />
        </label>
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Add section
        </button>
      </form>
    </PageShell>
  );
}
