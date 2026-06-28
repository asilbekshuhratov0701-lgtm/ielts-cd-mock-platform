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
  const parts: { text: string; optional: boolean }[] = [];
  const re = /\(([^)]*)\)|([^()]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(accepted)) !== null) {
    if (m[1] !== undefined) parts.push({ text: m[1], optional: true });
    else if (m[2] !== undefined) parts.push({ text: m[2], optional: false });
  }
  let variants = [""];
  for (const part of parts) {
    if (part.optional) {
      variants = variants.flatMap((v) => [v, `${v} ${part.text}`]);
    } else {
      variants = variants.map((v) => `${v} ${part.text}`);
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

function scoreOne(questionId: string, key: ImportAnswerKey, answer: CandidateAnswer): QuestionScore {
  const maxMarks = key.kind === "checkbox" ? (key.numbers?.length ?? key.accepted.length) : 1;
  let correct = false;

  if (key.kind === "checkbox") {
    correct = Array.isArray(answer) ? matchSet(answer, key.accepted) : false;
  } else if (typeof answer === "string") {
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
