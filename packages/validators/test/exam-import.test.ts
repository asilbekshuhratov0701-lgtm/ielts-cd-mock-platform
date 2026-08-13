import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateExamFile, formatReport, suggestQuestionType } from "../src/exam-import.ts";

const dir = path.dirname(fileURLToPath(import.meta.url));

function load(name: string): unknown {
  return JSON.parse(readFileSync(path.join(dir, "fixtures", name), "utf8"));
}

function examWithQuestionType(questionType: string): unknown {
  return {
    schemaVersion: 1,
    examId: "qtype-check",
    module: "reading",
    title: "Question type check",
    totalQuestions: 1,
    timerSource: "fixed",
    timeLimitMinutes: 60,
    sections: [
      {
        id: "s1",
        order: 0,
        groups: [
          {
            id: "g1",
            questionType,
            primitive: "select",
            instructions: "Match.",
            allowReuse: true,
            options: [
              { value: "A", label: "Alpha" },
              { value: "B", label: "Beta" }
            ],
            questions: [{ type: "select", id: "q1", number: 1, prompt: "first", answer: "A" }]
          }
        ]
      }
    ]
  };
}

test("valid reading fixture passes with no errors", () => {
  const report = validateExamFile(load("cam21-test1-reading.json"));
  assert.equal(report.ok, true, formatReport(report));
  assert.equal(report.errors.length, 0);
  assert.equal(report.questionCount, 40);
  assert.equal(report.totalQuestions, 40);
});

test("valid listening fixture passes and flags audio_pending", () => {
  const report = validateExamFile(load("cam21-test3-listening.json"));
  assert.equal(report.ok, true, formatReport(report));
  assert.equal(report.errors.length, 0);
  assert.equal(report.audioRequiredRef, "listening_main");
  assert.equal(report.audioPending, true);
  assert.ok(report.warnings.some((w) => w.code === "audio_pending"));
});

test("broken fixture is rejected with specific, located errors", () => {
  const report = validateExamFile(load("invalid-reading.json"));
  assert.equal(report.ok, false);
  const codes = report.errors.map((e) => e.code);
  assert.ok(codes.includes("gap_no_placeholder"), "expected gap_no_placeholder");
  assert.ok(codes.includes("empty_answer"), "expected empty_answer");
  assert.ok(codes.includes("answer_not_in_bank"), "expected answer_not_in_bank");
  assert.ok(codes.includes("checkbox_count"), "expected checkbox_count");
  assert.ok(codes.includes("checkbox_boxes"), "expected checkbox_boxes");
  assert.ok(codes.includes("missing_numbers"), "expected missing_numbers");

  const placeholder = report.errors.find((e) => e.code === "gap_no_placeholder");
  assert.ok(placeholder && placeholder.where.includes("Q2"));
});

test("valid writing fixture passes (essay tasks, no answer keys)", () => {
  const report = validateExamFile(load("writing-sample.json"));
  assert.equal(report.ok, true, formatReport(report));
  assert.equal(report.errors.length, 0);
  assert.equal(report.module, "writing");
  assert.equal(report.questionCount, 2);
  assert.equal(report.totalQuestions, 2);
});

test("word limit flags over-length accepted answers but ignores optional words", () => {
  const exam = {
    schemaVersion: 1,
    examId: "wordlimit-check",
    module: "reading",
    title: "Word limit check",
    totalQuestions: 2,
    timerSource: "fixed",
    timeLimitMinutes: 60,
    sections: [
      {
        id: "s1",
        order: 0,
        groups: [
          {
            id: "g1",
            questionType: "sentence_completion",
            primitive: "gap",
            wordLimit: 1,
            allowNumber: false,
            template: "The {{1}} crosses the {{2}}.",
            questions: [
              { type: "gap", id: "q1", number: 1, answer: ["(the) canal"] },
              { type: "gap", id: "q2", number: 2, answer: ["iron bridge"] }
            ]
          }
        ]
      }
    ]
  };
  const report = validateExamFile(exam);
  assert.equal(report.ok, true, formatReport(report));
  const over = report.warnings.filter((w) => w.code === "gap_over_word_limit");
  assert.equal(over.length, 1, "only the 2-word answer should warn");
  assert.ok(over[0].where.includes("Q2"));
});

test("non-object input fails schema validation cleanly", () => {
  const report = validateExamFile("not an exam");
  assert.equal(report.ok, false);
  assert.equal(report.parsed, null);
  assert.ok(report.errors.length > 0);
});

test("every known question type is accepted", () => {
  for (const t of [
    "mc_single",
    "matching_information",
    "matching_headings",
    "matching_features",
    "matching_sentence_endings",
    "summary_completion",
    "map_labelling"
  ]) {
    const report = validateExamFile(examWithQuestionType(t));
    assert.ok(
      !report.errors.some((e) => e.code === "unknown_question_type"),
      `'${t}' should be a known type`
    );
  }
});

test("a misspelled questionType is rejected with a suggestion", () => {
  const report = validateExamFile(examWithQuestionType("matching_feature"));
  assert.equal(report.ok, false);
  const err = report.errors.find((e) => e.code === "unknown_question_type");
  assert.ok(err, "expected unknown_question_type error");
  assert.ok(err.where.includes("g1"));
  assert.ok(
    err.message.includes("matching_features"),
    `expected a suggestion of matching_features, got: ${err.message}`
  );
});

test("a garbage questionType is rejected even without a close suggestion", () => {
  const report = validateExamFile(examWithQuestionType("totally_made_up_xyz"));
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((e) => e.code === "unknown_question_type"));
});

test("legacy questionType spellings are accepted with a non-blocking warning", () => {
  const report = validateExamFile(examWithQuestionType("multiple_choice_single"));
  assert.ok(
    !report.errors.some((e) => e.code === "unknown_question_type"),
    "legacy spelling must not error"
  );
  const warn = report.warnings.find((w) => w.code === "noncanonical_question_type");
  assert.ok(warn, "expected a noncanonical_question_type warning");
  assert.ok(warn.message.includes("mc_single"), `expected canonical hint, got: ${warn.message}`);
});

type Part = { text: string } | { gap: number };

function cell(parts: Part[], extra: Record<string, unknown> = {}): unknown {
  return { parts, ...extra };
}

function tableExam(
  template: unknown,
  questions: unknown[],
  totalQuestions = questions.length
): unknown {
  return {
    schemaVersion: 1,
    examId: "table-check",
    module: "reading",
    title: "Table check",
    totalQuestions,
    timerSource: "fixed",
    timeLimitMinutes: 60,
    sections: [
      {
        id: "s1",
        order: 0,
        groups: [
          {
            id: "g1",
            questionType: "table_completion",
            primitive: "gap",
            instructions: "Complete the table below.",
            wordLimit: 1,
            allowNumber: true,
            template,
            questions
          }
        ]
      }
    ]
  };
}

function gap(number: number, answer: string[]): unknown {
  return { type: "gap", id: `q${number}`, number, answer };
}

test("structured table fixture imports cleanly and round-trips its cells", () => {
  const raw = load("listening-table-completion.json") as {
    sections: { groups: { template: unknown }[] }[];
  };
  const report = validateExamFile(raw);

  assert.equal(report.ok, true, formatReport(report));
  assert.equal(report.errors.length, 0);
  assert.equal(report.questionCount, 4);
  assert.equal(report.audioRequiredRef, "section1.mp3");

  const source = raw.sections[0].groups[0].template;
  const parsed = report.parsed!.sections[0].groups[0].template;
  assert.deepStrictEqual(parsed, source, "structured template must survive validation unchanged");
});

test("a blank with no matching question is an orphan, located by row and cell", () => {
  const report = validateExamFile(
    tableExam(
      {
        format: "table",
        header: ["Item", "Detail"],
        rows: [
          { cells: [cell([{ text: "First" }]), cell([{ text: "max " }, { gap: 1 }])] },
          { cells: [cell([{ text: "Second" }]), cell([{ text: "cost " }, { gap: 2 }])] }
        ]
      },
      [gap(1, ["eight"])],
      1
    )
  );

  assert.equal(report.ok, false);
  const orphan = report.errors.find((e) => e.code === "gap_orphan_placeholder");
  assert.ok(orphan, `expected gap_orphan_placeholder, got: ${formatReport(report)}`);
  assert.ok(orphan.message.includes("2"), orphan.message);
  assert.ok(orphan.where.includes("row 2, cell 2"), orphan.where);
});

test("an answer with no blank in the table is reported against the question", () => {
  const report = validateExamFile(
    tableExam(
      {
        format: "table",
        header: ["Item", "Detail"],
        rows: [{ cells: [cell([{ text: "First" }]), cell([{ text: "max " }, { gap: 1 }])] }]
      },
      [gap(1, ["eight"]), gap(2, ["nine"])]
    )
  );

  assert.equal(report.ok, false);
  const missing = report.errors.find((e) => e.code === "gap_no_placeholder");
  assert.ok(missing, `expected gap_no_placeholder, got: ${formatReport(report)}`);
  assert.ok(missing.where.includes("Q2"), missing.where);
});

test("a blank number used twice in one table is rejected with both locations", () => {
  const report = validateExamFile(
    tableExam(
      {
        format: "table",
        header: ["Item", "Detail"],
        rows: [
          { cells: [cell([{ text: "First" }]), cell([{ text: "max " }, { gap: 1 }])] },
          { cells: [cell([{ text: "Second" }]), cell([{ text: "also " }, { gap: 1 }])] }
        ]
      },
      [gap(1, ["eight"])],
      1
    )
  );

  assert.equal(report.ok, false);
  const dup = report.errors.find((e) => e.code === "table_blank_duplicate");
  assert.ok(dup, `expected table_blank_duplicate, got: ${formatReport(report)}`);
  assert.ok(dup.where.includes("row 2, cell 2"), dup.where);
  assert.ok(dup.message.includes("row 1, cell 2"), dup.message);
});

test("a ragged row is rejected against the header width", () => {
  const report = validateExamFile(
    tableExam(
      {
        format: "table",
        header: ["Course", "Learn", "Cost"],
        rows: [
          {
            cells: [
              cell([{ text: "Taster" }]),
              cell([{ text: "sailing" }]),
              cell([{ text: "max " }, { gap: 1 }])
            ]
          },
          { cells: [cell([{ text: "Weekend" }]), cell([{ text: "navigation" }])] }
        ]
      },
      [gap(1, ["eight"])],
      1
    )
  );

  assert.equal(report.ok, false);
  const ragged = report.errors.find((e) => e.code === "table_row_width");
  assert.ok(ragged, `expected table_row_width, got: ${formatReport(report)}`);
  assert.ok(ragged.where.includes("row 2"), ragged.where);
  assert.ok(ragged.message.includes("2") && ragged.message.includes("3"), ragged.message);
});

test("colspan and rowspan count toward row width instead of cell count", () => {
  const report = validateExamFile(
    tableExam(
      {
        format: "table",
        header: ["Course", "Learn", "Cost", "Notes"],
        rows: [
          {
            cells: [
              cell([{ text: "Weekend" }], { rowspan: 2 }),
              cell([{ text: "sailing" }]),
              cell([{ text: "included in the " }, { gap: 1 }], { colspan: 2 })
            ]
          },
          {
            cells: [
              cell([{ text: "navigation" }]),
              cell([{ text: "£195" }]),
              cell([{ text: "bring a " }, { gap: 2 }])
            ]
          }
        ]
      },
      [gap(1, ["price"]), gap(2, ["lifejacket"])]
    )
  );

  assert.equal(report.ok, true, formatReport(report));
  assert.equal(report.errors.length, 0);
});

test("a cell holding several blanks registers every one of them", () => {
  const report = validateExamFile(
    tableExam(
      {
        format: "table",
        header: ["Course", "Detail"],
        rows: [
          {
            cells: [
              cell([{ text: "Weekend" }]),
              cell([
                { text: "£" },
                { gap: 1 },
                { text: " per " },
                { gap: 2 },
                { text: " including " },
                { gap: 3 }
              ])
            ]
          }
        ]
      },
      [gap(1, ["250"]), gap(2, ["person"]), gap(3, ["lunch"])]
    )
  );

  assert.equal(report.ok, true, formatReport(report));
  assert.equal(report.questionCount, 3);
});

test("accepted answers that collapse to the same string warn rather than fail", () => {
  const report = validateExamFile(
    tableExam(
      {
        format: "table",
        rows: [{ cells: [cell([{ text: "cost " }, { gap: 1 }])] }]
      },
      [gap(1, ["(the) canal", "canal"])]
    )
  );

  assert.equal(report.ok, true, formatReport(report));
  const dup = report.warnings.find((w) => w.code === "accept_duplicate");
  assert.ok(dup, `expected accept_duplicate, got: ${formatReport(report)}`);
  assert.ok(dup.message.includes("canal"), dup.message);
});

test("non-contiguous blank numbering warns without failing the import", () => {
  const report = validateExamFile(
    tableExam(
      {
        format: "table",
        rows: [
          { cells: [cell([{ text: "first " }, { gap: 1 }])] },
          { cells: [cell([{ text: "third " }, { gap: 3 }])] }
        ]
      },
      [gap(1, ["eight"]), gap(3, ["nine"]), gap(2, ["ten"])],
      3
    )
  );

  const discontinuity = report.warnings.find((w) => w.code === "gap_number_discontinuity");
  assert.ok(discontinuity, `expected gap_number_discontinuity, got: ${formatReport(report)}`);
  assert.ok(discontinuity.message.includes("1→3"), discontinuity.message);
});

test("a malformed structured table is rejected on shape, not on placeholders", () => {
  const report = validateExamFile(
    tableExam({ format: "table", header: ["Item"], rows: [{ cells: "not an array" }] }, [
      gap(1, ["eight"])
    ])
  );

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((e) => e.code === "table_schema"));
  assert.ok(
    !report.errors.some((e) => e.code === "gap_no_placeholder"),
    "a broken shape must not also emit misleading placeholder errors"
  );
});

test("IELTS aliases resolve to the canonical engine type", () => {
  assert.equal(suggestQuestionType("classification"), "matching_features");
  assert.equal(suggestQuestionType("Matching Names"), "matching_features");
  assert.equal(suggestQuestionType("plan_labelling"), "map_labelling");
  assert.equal(suggestQuestionType("mc_single"), "mc_single");
  assert.equal(suggestQuestionType("qwerty"), null);
});
