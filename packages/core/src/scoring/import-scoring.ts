export type ScoreKind = "gap" | "radio" | "select" | "checkbox";

export interface ImportAnswerKey {
  kind: ScoreKind;
  accepted: string[];
  numbers?: number[];
  orderIndependent?: boolean;
}

export type CandidateAnswer = string | string[] | null | undefined;

export interface QuestionScore {
  questionId: string;
  kind: ScoreKind;
  correct: boolean;
  marks: number;
  maxMarks: number;
}

export interface ExamScore {
  perQuestion: QuestionScore[];
  correct: number;
  total: number;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function expandOptionalAnswers(accepted: string): string[] {
  const segments: { text: string; optional: boolean }[] = [];
  const re = /\(([^)]*)\)|([^()]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(accepted)) !== null) {
    if (m[1] !== undefined) segments.push({ text: m[1], optional: true });
    else if (m[2] !== undefined) segments.push({ text: m[2], optional: false });
  }
  let variants = [""];
  for (const seg of segments) {
    if (seg.optional) {
      variants = variants.flatMap((v) => [v, v + seg.text]);
    } else {
      variants = variants.map((v) => v + seg.text);
    }
  }
  const out = new Set<string>();
  for (const v of variants) {
    const n = normalize(v);
    if (n.length > 0) out.add(n);
  }
  return [...out];
}

function acceptedSet(accepted: string[]): Set<string> {
  const set = new Set<string>();
  for (const a of accepted) for (const v of expandOptionalAnswers(a)) set.add(v);
  return set;
}

export function matchGap(input: string, accepted: string[]): boolean {
  const got = normalize(input);
  if (got.length === 0) return false;
  return acceptedSet(accepted).has(got);
}

export function matchChoice(input: string, accepted: string[]): boolean {
  const got = normalize(input);
  if (got.length === 0) return false;
  return accepted.some((a) => normalize(a) === got);
}

export function matchSet(input: string[], accepted: string[]): boolean {
  const got = new Set(input.map(normalize));
  const want = new Set(accepted.map(normalize));
  if (got.size !== want.size) return false;
  for (const w of want) if (!got.has(w)) return false;
  return true;
}

export function scoreCheckboxMarks(input: string[], accepted: string[]): number {
  const chosen = new Set(input.map(normalize));
  const want = new Set(accepted.map(normalize));
  if (chosen.size > want.size) return 0;
  let hit = 0;
  for (const w of want) if (chosen.has(w)) hit++;
  return hit;
}

function scoreOne(questionId: string, key: ImportAnswerKey, answer: CandidateAnswer): QuestionScore {
  const maxMarks = key.kind === "checkbox" ? (key.numbers?.length ?? key.accepted.length) : 1;

  if (key.kind === "checkbox") {
    const marks = Array.isArray(answer)
      ? Math.min(maxMarks, scoreCheckboxMarks(answer, key.accepted))
      : 0;
    return { questionId, kind: key.kind, correct: maxMarks > 0 && marks === maxMarks, marks, maxMarks };
  }

  let correct = false;
  if (typeof answer === "string") {
    correct = key.kind === "gap" ? matchGap(answer, key.accepted) : matchChoice(answer, key.accepted);
  }

  return {
    questionId,
    kind: key.kind,
    correct,
    marks: correct ? maxMarks : 0,
    maxMarks
  };
}

export function scoreImportedExam(
  answerKey: Record<string, ImportAnswerKey>,
  answers: Record<string, CandidateAnswer>
): ExamScore {
  const perQuestion: QuestionScore[] = [];
  let correct = 0;
  let total = 0;
  for (const [questionId, key] of Object.entries(answerKey)) {
    const result = scoreOne(questionId, key, answers[questionId]);
    perQuestion.push(result);
    correct += result.marks;
    total += result.maxMarks;
  }
  return { perQuestion, correct, total };
}
