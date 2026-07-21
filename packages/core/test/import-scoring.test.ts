import { test } from "node:test";
import assert from "node:assert/strict";
import {
  expandOptionalAnswers,
  matchGap,
  matchChoice,
  matchSet,
  scoreCheckboxMarks,
  scoreImportedExam,
  type ImportAnswerKey
} from "../src/scoring/import-scoring.ts";

test("gap: trim, collapse whitespace, case-insensitive", () => {
  assert.equal(matchGap("  Behaviour ", ["behaviour"]), true);
  assert.equal(matchGap("two   words", ["two words"]), true);
  assert.equal(matchGap("BEHAVIOUR", ["behaviour"]), true);
  assert.equal(matchGap("wrong", ["behaviour"]), false);
});

test("gap: accepts listed variants and number spellings", () => {
  assert.equal(matchGap("color", ["colour", "color"]), true);
  assert.equal(matchGap("two hundred and fifty", ["250", "two hundred and fifty"]), true);
  assert.equal(matchGap("250", ["250", "two hundred and fifty"]), true);
});

test("gap: hyphenated word is one token and matches", () => {
  assert.equal(matchGap("check-in", ["check-in"]), true);
});

test("gap: bracketed words in the key are optional", () => {
  assert.deepEqual(expandOptionalAnswers("(hexagonal) combs").sort(), [
    "combs",
    "hexagonal combs"
  ]);
  assert.equal(matchGap("combs", ["(hexagonal) combs"]), true);
  assert.equal(matchGap("hexagonal combs", ["(hexagonal) combs"]), true);
  assert.equal(matchGap("round combs", ["(hexagonal) combs"]), false);
});

test("gap: in-word optional suffix (s) accepts singular and plural without a stray space", () => {
  assert.deepEqual(expandOptionalAnswers("book(s)").sort(), ["book", "books"]);
  assert.equal(matchGap("books", ["book(s)"]), true);
  assert.equal(matchGap("book", ["book(s)"]), true);
  assert.equal(matchGap("colours", ["colour(s)"]), true);
  assert.equal(matchGap("1930s", ["1930(s)"]), true);
});

test("radio/select: exact value match, case-insensitive", () => {
  assert.equal(matchChoice("B", ["B"]), true);
  assert.equal(matchChoice("not_given", ["NOT_GIVEN"]), true);
  assert.equal(matchChoice("A", ["B"]), false);
});

test("checkbox: unordered set equality only", () => {
  assert.equal(matchSet(["A", "C"], ["C", "A"]), true);
  assert.equal(matchSet(["A"], ["A", "C"]), false);
  assert.equal(matchSet(["A", "B"], ["A", "C"]), false);
});

test("checkbox: partial credit — one mark per correct letter (IELTS rule)", () => {
  assert.equal(scoreCheckboxMarks(["A", "C"], ["A", "C"]), 2);
  assert.equal(scoreCheckboxMarks(["A"], ["A", "C"]), 1);
  assert.equal(scoreCheckboxMarks(["A", "B"], ["A", "C"]), 1);
  assert.equal(scoreCheckboxMarks(["B"], ["A", "C"]), 0);
  assert.equal(scoreCheckboxMarks(["A", "B", "C"], ["A", "C"]), 0, "over-selection voids the answer");
});

test("scoreImportedExam tallies marks; checkbox worth its box count", () => {
  const key: Record<string, ImportAnswerKey> = {
    q1: { kind: "gap", accepted: ["colour", "color"] },
    q2: { kind: "radio", accepted: ["B"] },
    q3: { kind: "select", accepted: ["iii"] },
    "q4-5": { kind: "checkbox", accepted: ["A", "C"], numbers: [4, 5] }
  };

  const allRight = scoreImportedExam(key, {
    q1: "Color",
    q2: "B",
    q3: "iii",
    "q4-5": ["C", "A"]
  });
  assert.equal(allRight.total, 5);
  assert.equal(allRight.correct, 5);
  assert.ok(allRight.perQuestion.every((p) => p.correct));

  const someWrong = scoreImportedExam(key, {
    q1: "wrong",
    q2: "B",
    q3: "iv",
    "q4-5": ["A"]
  });
  assert.equal(someWrong.total, 5);
  assert.equal(someWrong.correct, 2, "radio B (1) + one correct checkbox letter A (1)");
});

test("missing answers score zero, not crash", () => {
  const key: Record<string, ImportAnswerKey> = {
    q1: { kind: "gap", accepted: ["x"] },
    q2: { kind: "checkbox", accepted: ["A", "B"], numbers: [2, 3] }
  };
  const score = scoreImportedExam(key, {});
  assert.equal(score.correct, 0);
  assert.equal(score.total, 3);
});
