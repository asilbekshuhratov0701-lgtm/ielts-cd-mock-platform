import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateExamFile, formatReport } from "../src/exam-import.ts";

const dir = path.dirname(fileURLToPath(import.meta.url));

function load(name: string): unknown {
  return JSON.parse(readFileSync(path.join(dir, "fixtures", name), "utf8"));
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

test("non-object input fails schema validation cleanly", () => {
  const report = validateExamFile("not an exam");
  assert.equal(report.ok, false);
  assert.equal(report.parsed, null);
  assert.ok(report.errors.length > 0);
});
