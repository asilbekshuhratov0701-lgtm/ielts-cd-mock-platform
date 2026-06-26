import Anthropic from "@anthropic-ai/sdk";

export type DraftAnswerType = "SINGLE" | "MULTI" | "TEXT";

export interface ExamDraftQuestion {
  number: number;
  prompt: string;
  answerType: DraftAnswerType;
  options?: { value: string; label: string }[];
  acceptedAnswers?: string[];
}

export interface ExamDraftGroup {
  type: string;
  instructions: string;
  questions: ExamDraftQuestion[];
}

export interface ExamDraftPassage {
  title?: string;
  body: string;
}

export interface ExamDraftWritingTask {
  taskNo: number;
  prompt: string;
  minWords?: number;
}

export interface ExamDraftSection {
  kind: "LISTENING" | "READING" | "WRITING";
  durationSec?: number;
  passages?: ExamDraftPassage[];
  writingTasks?: ExamDraftWritingTask[];
  groups?: ExamDraftGroup[];
}

export interface ExamDraft {
  title: string;
  moduleType: "ACADEMIC" | "GENERAL";
  sections: ExamDraftSection[];
}

export interface GenerateOptions {
  apiKey?: string;
  model?: string;
  provider?: "anthropic" | "mock";
}

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

const SYSTEM_PROMPT = `You are an IELTS exam digitiser. You convert raw text extracted from an IELTS mock-exam document into a structured Computer-Delivered exam.

Rules:
- Identify the Listening, Reading and Writing sections that are present (some documents only contain one or two).
- Reading sections: include each passage's full text in "passages". Group questions and set the correct official IELTS "type" for each group.
- Writing sections: include each task in "writingTasks" with its prompt and minimum word count (Task 1 = 150, Task 2 = 250 unless stated).
- For each question set "answerType": SINGLE for one-choice (Multiple Choice, True/False/Not Given, Yes/No/Not Given, matching-to-letters), MULTI for choose-multiple, TEXT for completion / short-answer.
- For completion / gap-fill questions (sentence, note, table, flow-chart, summary completion), write the "prompt" as the full sentence or line with the blank marked by a run of underscores (e.g. "The library opens at ___ a.m."). Use one blank per question.
- For choice questions, provide "options" as { value, label } (value is the letter/key the candidate selects, label is the option text).
- Preserve the original question numbering and order.
- Only fill "acceptedAnswers" when the correct answers are explicitly present in the document (e.g. an answer key / answers section). If answers are not in the document, leave "acceptedAnswers" empty — the administrator will enter them.
- Keep instructions concise and faithful to the original.`;

const BUILD_EXAM_TOOL: Anthropic.Tool = {
  name: "build_exam",
  description: "Return the digitised IELTS exam as structured data.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      moduleType: { type: "string", enum: ["ACADEMIC", "GENERAL"] },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["LISTENING", "READING", "WRITING"] },
            durationSec: { type: "number" },
            passages: {
              type: "array",
              items: {
                type: "object",
                properties: { title: { type: "string" }, body: { type: "string" } },
                required: ["body"]
              }
            },
            writingTasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  taskNo: { type: "number" },
                  prompt: { type: "string" },
                  minWords: { type: "number" }
                },
                required: ["taskNo", "prompt"]
              }
            },
            groups: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: QUESTION_TYPES },
                  instructions: { type: "string" },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        number: { type: "number" },
                        prompt: { type: "string" },
                        answerType: { type: "string", enum: ["SINGLE", "MULTI", "TEXT"] },
                        options: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              value: { type: "string" },
                              label: { type: "string" }
                            },
                            required: ["value", "label"]
                          }
                        },
                        acceptedAnswers: { type: "array", items: { type: "string" } }
                      },
                      required: ["number", "prompt", "answerType"]
                    }
                  }
                },
                required: ["type", "instructions", "questions"]
              }
            }
          },
          required: ["kind"]
        }
      }
    },
    required: ["title", "sections"]
  }
};

function normalizeDraft(input: unknown): ExamDraft {
  const draft = input as Partial<ExamDraft>;
  return {
    title: draft.title?.trim() || "Imported exam",
    moduleType: draft.moduleType === "GENERAL" ? "GENERAL" : "ACADEMIC",
    sections: Array.isArray(draft.sections) ? draft.sections : []
  };
}

async function generateWithClaude(text: string, opts: GenerateOptions): Promise<ExamDraft> {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const message = await client.messages.create({
    model: opts.model ?? "claude-opus-4-8",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    tools: [BUILD_EXAM_TOOL],
    tool_choice: { type: "tool", name: "build_exam" },
    messages: [
      {
        role: "user",
        content: `Digitise this IELTS exam document into a Computer-Delivered mock exam.\n\nDOCUMENT TEXT:\n${text.slice(0, 120000)}`
      }
    ]
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) throw new Error("AI did not return a structured exam.");
  return normalizeDraft(toolUse.input);
}

function generateMock(text: string): ExamDraft {
  const excerpt = text.replace(/\s+/g, " ").trim().slice(0, 1800);
  return {
    title: "Imported exam (mock — no AI key)",
    moduleType: "ACADEMIC",
    sections: [
      {
        kind: "READING",
        durationSec: 3600,
        passages: [{ title: "Imported passage", body: excerpt || "No text could be extracted." }],
        groups: [
          {
            type: "TRUE_FALSE_NOT_GIVEN",
            instructions:
              "Mock import: set ANTHROPIC_API_KEY for real AI extraction. Edit these questions in the builder.",
            questions: [1, 2, 3].map((n) => ({
              number: n,
              prompt: `Statement ${n} about the passage.`,
              answerType: "SINGLE" as const,
              options: [
                { value: "TRUE", label: "TRUE" },
                { value: "FALSE", label: "FALSE" },
                { value: "NOT_GIVEN", label: "NOT GIVEN" }
              ]
            }))
          }
        ]
      }
    ]
  };
}

export async function generateExamDraft(
  text: string,
  opts: GenerateOptions = {}
): Promise<ExamDraft> {
  if (opts.provider === "mock" || !opts.apiKey) {
    return generateMock(text);
  }
  return generateWithClaude(text, opts);
}
