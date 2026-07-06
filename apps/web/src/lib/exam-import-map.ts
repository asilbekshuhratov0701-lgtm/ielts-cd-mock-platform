import type {
  ExamFile,
  ExamGroup,
  ExamOption,
  ExamQuestion
} from "@ielts/validators";
import type {
  FlowchartContent,
  FormContent,
  GapLayout,
  NoteContent,
  QuestionGroup,
  QuestionType,
  SentenceContent,
  SummaryContent,
  TableContent
} from "@/components/question-engine/types";

export interface PreviewSection {
  id: string;
  title: string;
  instructions: string;
  subtitle?: string;
  scenario?: string;
  passageBlocks: { text: string; label?: string }[];
  groups: QuestionGroup[];
}

export interface PreviewExam {
  examId: string;
  module: "reading" | "listening" | "writing";
  title: string;
  timerSource: "fixed" | "audio";
  timeLimitMinutes: number | null;
  audioRef: string | null;
  totalQuestions: number;
  sections: PreviewSection[];
}

const QUESTION_TYPES = new Set<QuestionType>([
  "mc_single",
  "mc_multiple",
  "true_false_not_given",
  "yes_no_not_given",
  "matching_information",
  "matching_headings",
  "matching_features",
  "matching_sentence_endings",
  "note_completion",
  "summary_completion",
  "table_completion",
  "form_completion",
  "flowchart_completion",
  "sentence_completion",
  "short_answer",
  "map_labelling",
  "diagram_labelling"
]);

function toQuestionType(value: string): QuestionType {
  return QUESTION_TYPES.has(value as QuestionType) ? (value as QuestionType) : "short_answer";
}

function optionValue(o: ExamOption): string {
  return o.value ?? o.id ?? o.key ?? "";
}
function optionLabel(o: ExamOption): string {
  return o.label ?? o.text ?? optionValue(o);
}

function numbersOf(q: ExamQuestion): number[] {
  return q.type === "checkbox" ? q.numbers : [q.number];
}

function range(numbers: number[]): [number, number] {
  if (numbers.length === 0) return [0, 0];
  return [Math.min(...numbers), Math.max(...numbers)];
}

function lines(template: string): string[] {
  return template
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function gapLayoutOf(questionType: string): GapLayout {
  switch (questionType) {
    case "note_completion":
      return "note";
    case "summary_completion":
      return "summary";
    case "table_completion":
      return "table";
    case "form_completion":
      return "form";
    case "flowchart_completion":
      return "flowchart";
    case "diagram_labelling":
    case "map_labelling":
      return "image";
    default:
      return "sentence";
  }
}

function gapContent(layout: GapLayout, template: string, gapNumbers: number[]): unknown {
  const fallback = gapNumbers.map((n) => `{{${n}}}`).join(" ");
  switch (layout) {
    case "summary":
      return { paragraphs: [template || fallback] } satisfies SummaryContent;
    case "note": {
      const items = template ? lines(template) : gapNumbers.map((n) => `{{${n}}}`);
      return { sections: [{ items }] } satisfies NoteContent;
    }
    case "form": {
      const rows = (template ? lines(template) : gapNumbers.map((n) => `{{${n}}}`)).map((line) => {
        const idx = line.indexOf(":");
        if (idx === -1) return { label: "", value: line };
        return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
      });
      return { rows } satisfies FormContent;
    }
    case "flowchart": {
      const nodes = (template ? lines(template) : gapNumbers.map((n) => `{{${n}}}`)).map(
        (text, i) => ({ id: `n${i}`, text })
      );
      return { nodes } satisfies FlowchartContent;
    }
    case "table": {
      const rows = (template ? lines(template) : gapNumbers.map((n) => `{{${n}}}`)).map((line) =>
        line.split("|").map((cell) => cell.trim())
      );
      return { rows } satisfies TableContent;
    }
    case "image": {
      const items = template ? lines(template) : gapNumbers.map((n) => `${n}. {{${n}}}`);
      return { items };
    }
    default: {
      const sentences = template ? lines(template) : gapNumbers.map((n) => `{{${n}}}`);
      return { sentences } satisfies SentenceContent;
    }
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function noteContentFromLines(
  title: string | undefined,
  rawLines: { style?: string; text?: string }[]
): NoteContent {
  const sections: NoteContent["sections"] = [];
  let current: NoteContent["sections"][number] = { items: [] };
  let started = false;
  for (const line of rawLines) {
    const text = line.text ?? "";
    if (line.style === "heading") {
      if (started || current.items.length > 0) sections.push(current);
      current = { heading: text, items: [] };
      started = true;
    } else {
      current.items.push({ text, sub: line.style === "subbullet", plain: line.style === "plain" });
    }
  }
  sections.push(current);
  return { title, sections };
}

function gapLayoutAndContent(group: ExamGroup): { layout: GapLayout; content: unknown } {
  const t = asObject(group.template);
  if (t) {
    if (t.format === "notes" && Array.isArray(t.lines)) {
      return {
        layout: "note",
        content: noteContentFromLines(
          typeof t.title === "string" ? t.title : undefined,
          t.lines as { style?: string; text?: string }[]
        )
      };
    }
    if (t.format === "summary" && Array.isArray(t.paragraphs)) {
      return {
        layout: "summary",
        content: {
          title: typeof t.title === "string" ? t.title : undefined,
          paragraphs: (t.paragraphs as unknown[]).map((p) => String(p))
        } satisfies SummaryContent
      };
    }
  }
  const layout = gapLayoutOf(group.questionType);
  const template = typeof group.template === "string" ? group.template : "";
  const gapNumbers = group.questions.filter((q) => q.type === "gap").flatMap(numbersOf);
  return { layout, content: gapContent(layout, template, gapNumbers) };
}

function summaryParagraphs(group: ExamGroup): string[] | undefined {
  const t = asObject(group.template);
  if (t && t.format === "summary" && Array.isArray(t.paragraphs)) {
    return (t.paragraphs as unknown[]).map((p) => String(p));
  }
  return undefined;
}

function mapGroup(group: ExamGroup): QuestionGroup[] {
  const questionType = toQuestionType(group.questionType);
  const allNumbers = group.questions.flatMap(numbersOf);

  if (group.primitive === "radio") {
    const questions = group.questions.flatMap((q) =>
      q.type === "radio"
        ? [
            {
              id: q.id,
              number: q.number,
              stem: q.prompt ?? "",
              options: (q.options ?? group.options ?? []).map((o) => ({
                value: optionValue(o),
                label: optionLabel(o)
              }))
            }
          ]
        : []
    );
    return [
      {
        id: group.id,
        questionType,
        inputKind: "radio",
        instructions: group.instructions ?? "",
        numberRange: range(allNumbers),
        questions
      }
    ];
  }

  if (group.primitive === "checkbox") {
    return group.questions.flatMap((q) =>
      q.type === "checkbox"
        ? [
            {
              id: q.id,
              questionType,
              inputKind: "checkbox" as const,
              instructions: group.instructions ?? "",
              numberRange: range(q.numbers),
              stem: q.prompt ?? "",
              options: q.options.map((o) => ({ value: optionValue(o), label: optionLabel(o) })),
              maxSelections: q.selectCount
            }
          ]
        : []
    );
  }

  if (group.primitive === "select") {
    const prompts = group.questions.flatMap((q) =>
      q.type === "select" ? [{ id: q.id, number: q.number, text: q.prompt ?? "" }] : []
    );
    return [
      {
        id: group.id,
        questionType,
        inputKind: "select",
        instructions: group.instructions ?? "",
        numberRange: range(allNumbers),
        renderAs: "dropdown",
        prompts,
        optionBank: (group.options ?? []).map((o) => ({ id: optionValue(o), text: optionLabel(o) })),
        allowReuse: group.allowReuse ?? false,
        fixedLabels: false,
        paragraphs: summaryParagraphs(group)
      }
    ];
  }

  if (group.primitive === "essay") {
    const tasks = group.questions.flatMap((q) =>
      q.type === "essay"
        ? [
            {
              id: q.id,
              number: q.number,
              prompt: q.prompt,
              minWords: q.minWords,
              imageUrl: q.imageUrl
            }
          ]
        : []
    );
    return [
      {
        id: group.id,
        questionType,
        inputKind: "essay",
        instructions: group.instructions ?? "",
        numberRange: range(allNumbers),
        tasks
      }
    ];
  }

  const { layout, content } = gapLayoutAndContent(group);
  const wordLimit = typeof group.wordLimit === "number" ? group.wordLimit : 0;
  const allowNumber = group.allowNumber ?? true;
  return [
    {
      id: group.id,
      questionType,
      inputKind: "gap",
      instructions: group.instructions ?? "",
      numberRange: range(allNumbers),
      layout,
      content,
      gaps: group.questions
        .filter((q) => q.type === "gap")
        .map((q) => ({ id: q.id, number: q.number, wordLimit, allowNumber }))
    }
  ];
}

export function mapExamFile(exam: ExamFile): PreviewExam {
  const sections: PreviewSection[] = exam.sections.map((section) => ({
    id: section.id,
    title: section.title ?? "",
    instructions: section.instructions ?? "",
    subtitle: section.passage?.subtitle,
    scenario: section.scenario,
    passageBlocks: (section.passage?.blocks ?? []).map((b) => ({ text: b.text, label: b.label })),
    groups: section.groups.flatMap(mapGroup)
  }));

  return {
    examId: exam.examId,
    module: exam.module,
    title: exam.title,
    timerSource: exam.timerSource,
    timeLimitMinutes: exam.timeLimitMinutes ?? null,
    audioRef: exam.audio?.ref ?? null,
    totalQuestions: exam.totalQuestions,
    sections
  };
}
