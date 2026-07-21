import { z } from "zod";

export const examPrimitive = z.enum(["radio", "checkbox", "gap", "select", "essay"]);
export const examModule = z.enum(["reading", "listening", "writing"]);

const optionSchema = z
  .object({
    value: z.string().optional(),
    id: z.string().optional(),
    key: z.string().optional(),
    label: z.string().optional(),
    text: z.string().optional()
  })
  .passthrough();
export type ExamOption = z.infer<typeof optionSchema>;

function optionValue(o: ExamOption): string | null {
  return o.value ?? o.id ?? o.key ?? null;
}

const gapQuestion = z.object({
  type: z.literal("gap"),
  id: z.string().min(1),
  number: z.number().int().positive(),
  answer: z.array(z.string())
});

const radioQuestion = z.object({
  type: z.literal("radio"),
  id: z.string().min(1),
  number: z.number().int().positive(),
  prompt: z.string().optional(),
  answer: z.string(),
  options: z.array(optionSchema).optional()
});

const checkboxQuestion = z.object({
  type: z.literal("checkbox"),
  id: z.string().min(1),
  numbers: z.array(z.number().int().positive()).min(1),
  prompt: z.string().optional(),
  selectCount: z.number().int().positive(),
  options: z.array(optionSchema),
  answer: z.array(z.string()),
  orderIndependent: z.boolean().optional()
});

const selectQuestion = z.object({
  type: z.literal("select"),
  id: z.string().min(1),
  number: z.number().int().positive(),
  prompt: z.string().optional(),
  answer: z.string()
});

const essayQuestion = z.object({
  type: z.literal("essay"),
  id: z.string().min(1),
  number: z.number().int().positive(),
  prompt: z.string().min(1),
  minWords: z.number().int().positive().optional(),
  imageUrl: z.string().optional()
});

export const examQuestionSchema = z.discriminatedUnion("type", [
  gapQuestion,
  radioQuestion,
  checkboxQuestion,
  selectQuestion,
  essayQuestion
]);
export type ExamQuestion = z.infer<typeof examQuestionSchema>;

const groupSchema = z
  .object({
    id: z.string().min(1),
    questionType: z.string().min(1),
    primitive: examPrimitive,
    range: z
      .union([z.tuple([z.number(), z.number()]), z.array(z.number()), z.string()])
      .optional(),
    instructions: z.string().optional().default(""),
    template: z.union([z.string(), z.object({}).passthrough()]).optional(),
    options: z.array(optionSchema).optional(),
    allowReuse: z.boolean().optional(),
    renderAs: z.enum(["dropdown", "drag", "table"]).optional(),
    wordLimit: z.number().int().positive().optional(),
    allowNumber: z.boolean().optional(),
    presentation: z.enum(["inline", "list"]).optional(),
    questions: z.array(examQuestionSchema)
  })
  .passthrough();
export type ExamGroup = z.infer<typeof groupSchema>;

const passageSchema = z
  .object({
    subtitle: z.string().optional(),
    blocks: z.array(
      z.object({ text: z.string(), label: z.string().optional() }).passthrough()
    ),
    footnotes: z.array(z.union([z.string(), z.object({}).passthrough()])).optional()
  })
  .passthrough();

const sectionSchema = z
  .object({
    id: z.string().min(1),
    order: z.number().int().nonnegative(),
    title: z.string().optional().default(""),
    instructions: z.string().optional().default(""),
    passage: passageSchema.optional(),
    scenario: z.string().optional(),
    transcript: z.string().optional(),
    groups: z.array(groupSchema)
  })
  .passthrough();

const audioSchema = z
  .object({
    ref: z.string().min(1),
    required: z.boolean().optional().default(true),
    boundAtUpload: z.boolean().optional(),
    playOnce: z.boolean().optional(),
    autostartOnSectionStart: z.boolean().optional(),
    note: z.string().optional()
  })
  .passthrough();

export const examFileSchema = z
  .object({
    schemaVersion: z.union([z.string(), z.number()]),
    examId: z.string().min(1),
    module: examModule,
    title: z.string().min(1),
    meta: z.unknown().optional(),
    totalQuestions: z.number().int().positive(),
    timerSource: z.enum(["fixed", "audio"]),
    timeLimitMinutes: z.number().nullable().optional(),
    audio: audioSchema.optional(),
    sections: z.array(sectionSchema).min(1)
  })
  .passthrough();
export type ExamFile = z.infer<typeof examFileSchema>;

export type IssueLevel = "error" | "warning";

export interface ValidationIssue {
  level: IssueLevel;
  code: string;
  where: string;
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  examId: string | null;
  module: string | null;
  totalQuestions: number | null;
  questionCount: number;
  audioRequiredRef: string | null;
  audioPending: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  parsed: ExamFile | null;
}

function formatValues(values: string[]): string {
  if (values.length === 0) return "(none)";
  if (values.length <= 12) return values.join(", ");
  return `${values.slice(0, 12).join(", ")}, … (${values.length} total)`;
}

function questionNumbers(q: ExamQuestion): number[] {
  return q.type === "checkbox" ? q.numbers : [q.number];
}

function questionWhere(groupId: string, q: ExamQuestion): string {
  const ns = questionNumbers(q)
    .map((n) => `Q${n}`)
    .join("/");
  return `group ${groupId}, ${ns}`;
}

function minimalWordCount(answer: string): number {
  const stripped = answer
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length === 0 ? 0 : stripped.split(" ").length;
}

function hasAnswer(q: ExamQuestion): boolean {
  if (q.type === "essay") return true;
  if (q.type === "gap") return q.answer.some((a) => a.trim().length > 0);
  if (q.type === "checkbox") return q.answer.length > 0;
  return q.answer.trim().length > 0;
}

export function validateExamFile(input: unknown): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const parse = examFileSchema.safeParse(input);
  if (!parse.success) {
    for (const issue of parse.error.issues) {
      const path = issue.path.length > 0 ? issue.path.join(".") : "exam";
      errors.push({ level: "error", code: "schema", where: path, message: issue.message });
    }
    return {
      ok: false,
      examId: null,
      module: null,
      totalQuestions: null,
      questionCount: 0,
      audioRequiredRef: null,
      audioPending: false,
      errors,
      warnings,
      parsed: null
    };
  }

  const exam = parse.data;
  const seenNumbers = new Map<number, number>();

  for (const section of exam.sections) {
    for (const group of section.groups) {
      const groupValues = (group.options ?? [])
        .map(optionValue)
        .filter((v): v is string => v !== null);

      const selectAnswerUsage = new Map<string, number>();

      for (const q of group.questions) {
        const where = questionWhere(group.id, q);

        if (q.type !== group.primitive) {
          errors.push({
            level: "error",
            code: "primitive_mismatch",
            where,
            message: `question type '${q.type}' does not match group primitive '${group.primitive}'`
          });
        }

        if (!hasAnswer(q)) {
          errors.push({
            level: "error",
            code: "empty_answer",
            where,
            message: "answer is empty"
          });
        }

        for (const n of questionNumbers(q)) {
          seenNumbers.set(n, (seenNumbers.get(n) ?? 0) + 1);
        }

        if (q.type === "gap") {
          if (group.template === undefined) {
            errors.push({
              level: "error",
              code: "gap_no_template",
              where,
              message: "gap group has no 'template' to host the {{n}} placeholder"
            });
          } else {
            const templateText =
              typeof group.template === "string"
                ? group.template
                : JSON.stringify(group.template);
            if (!templateText.includes(`{{${q.number}}}`)) {
              errors.push({
                level: "error",
                code: "gap_no_placeholder",
                where,
                message: `template is missing the {{${q.number}}} placeholder`
              });
            }
          }

          if (typeof group.wordLimit === "number") {
            for (const answer of q.answer) {
              const count = minimalWordCount(answer);
              if (count > group.wordLimit) {
                warnings.push({
                  level: "warning",
                  code: "gap_over_word_limit",
                  where,
                  message: `accepted answer '${answer}' needs ${count} words but the group word limit is ${group.wordLimit}`
                });
              }
            }
          }
        }

        if (q.type === "radio") {
          const values =
            q.options && q.options.length > 0
              ? q.options.map(optionValue).filter((v): v is string => v !== null)
              : groupValues;
          if (values.length === 0) {
            errors.push({
              level: "error",
              code: "radio_no_options",
              where,
              message: "no options defined on the question or its group"
            });
          } else if (!values.includes(q.answer)) {
            errors.push({
              level: "error",
              code: "answer_not_in_options",
              where,
              message: `answer '${q.answer}' not in options ${formatValues(values)}`
            });
          }
        }

        if (q.type === "select") {
          if (groupValues.length === 0) {
            errors.push({
              level: "error",
              code: "select_no_bank",
              where,
              message: "group has no shared option bank"
            });
          } else if (!groupValues.includes(q.answer)) {
            errors.push({
              level: "error",
              code: "answer_not_in_bank",
              where,
              message: `answer '${q.answer}' not in option bank ${formatValues(groupValues)}`
            });
          }
          selectAnswerUsage.set(q.answer, (selectAnswerUsage.get(q.answer) ?? 0) + 1);
        }

        if (q.type === "checkbox") {
          const values = q.options.map(optionValue).filter((v): v is string => v !== null);
          const unique = new Set(q.answer);
          if (unique.size !== q.answer.length) {
            errors.push({
              level: "error",
              code: "checkbox_duplicate",
              where,
              message: "answer contains duplicate selections"
            });
          }
          if (q.answer.length !== q.selectCount) {
            errors.push({
              level: "error",
              code: "checkbox_count",
              where,
              message: `answer has ${q.answer.length} value(s) but selectCount is ${q.selectCount}`
            });
          }
          if (q.numbers.length !== q.selectCount) {
            errors.push({
              level: "error",
              code: "checkbox_boxes",
              where,
              message: `mapped to ${q.numbers.length} question number(s) but selectCount is ${q.selectCount}`
            });
          }
          for (const a of q.answer) {
            if (!values.includes(a)) {
              errors.push({
                level: "error",
                code: "answer_not_in_options",
                where,
                message: `answer '${a}' not in options ${formatValues(values)}`
              });
            }
          }
        }
      }

      if (group.primitive === "select" && group.allowReuse === false) {
        for (const [value, count] of selectAnswerUsage) {
          if (count > 1) {
            warnings.push({
              level: "warning",
              code: "reuse_disallowed",
              where: `group ${group.id}`,
              message: `option '${value}' is used by ${count} prompts but allowReuse is false`
            });
          }
        }
      }
    }
  }

  for (const [n, count] of seenNumbers) {
    if (count > 1) {
      errors.push({
        level: "error",
        code: "duplicate_number",
        where: `Q${n}`,
        message: `question number ${n} is used ${count} times`
      });
    }
  }
  const missing: number[] = [];
  for (let n = 1; n <= exam.totalQuestions; n += 1) {
    if (!seenNumbers.has(n)) missing.push(n);
  }
  if (missing.length > 0) {
    errors.push({
      level: "error",
      code: "missing_numbers",
      where: "exam",
      message: `missing question number(s): ${formatValues(missing.map(String))}`
    });
  }
  const extra = [...seenNumbers.keys()].filter((n) => n < 1 || n > exam.totalQuestions).sort();
  if (extra.length > 0) {
    errors.push({
      level: "error",
      code: "extra_numbers",
      where: "exam",
      message: `question number(s) outside 1..${exam.totalQuestions}: ${formatValues(
        extra.map(String)
      )}`
    });
  }

  if (exam.timerSource === "fixed") {
    if (typeof exam.timeLimitMinutes !== "number" || exam.timeLimitMinutes <= 0) {
      errors.push({
        level: "error",
        code: "timer_fixed",
        where: "exam",
        message: "timerSource 'fixed' requires a positive timeLimitMinutes"
      });
    }
  } else if (exam.timeLimitMinutes != null) {
    warnings.push({
      level: "warning",
      code: "timer_audio",
      where: "exam",
      message: "timerSource 'audio' should have timeLimitMinutes null (timer follows the audio)"
    });
  }

  let audioRequiredRef: string | null = null;
  let audioPending = false;
  if (exam.module === "listening") {
    if (exam.timerSource !== "audio") {
      warnings.push({
        level: "warning",
        code: "listening_timer",
        where: "exam",
        message: "listening modules normally use timerSource 'audio'"
      });
    }
    if (!exam.audio) {
      errors.push({
        level: "error",
        code: "listening_no_audio",
        where: "exam",
        message: "listening exam has no 'audio' block with a ref"
      });
    } else if (exam.audio.required) {
      audioRequiredRef = exam.audio.ref;
      audioPending = true;
      warnings.push({
        level: "warning",
        code: "audio_pending",
        where: "exam",
        message: `audio file '${exam.audio.ref}' must be uploaded before publish (exam stays audio_pending until then)`
      });
    }
  }

  return {
    ok: errors.length === 0,
    examId: exam.examId,
    module: exam.module,
    totalQuestions: exam.totalQuestions,
    questionCount: seenNumbers.size,
    audioRequiredRef,
    audioPending,
    errors,
    warnings,
    parsed: exam
  };
}

export function formatReport(report: ValidationReport): string {
  const lines: string[] = [];
  const head = report.ok ? "VALID" : "INVALID";
  lines.push(
    `[${head}] ${report.module ?? "?"} · ${report.examId ?? "?"} · ${report.questionCount}/${
      report.totalQuestions ?? "?"
    } questions`
  );
  if (report.audioRequiredRef) {
    lines.push(`  audio required: ${report.audioRequiredRef} (audio_pending until uploaded)`);
  }
  for (const e of report.errors) lines.push(`  ✖ [${e.code}] ${e.where}: ${e.message}`);
  for (const w of report.warnings) lines.push(`  ⚠ [${w.code}] ${w.where}: ${w.message}`);
  if (report.errors.length === 0 && report.warnings.length === 0) lines.push("  no issues");
  return lines.join("\n");
}
