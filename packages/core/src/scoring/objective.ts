export type MatchMode = "EXACT" | "CONTAINS" | "REGEX" | "SET";

export interface KeyedAnswer {
  questionId: string;
  accepted: string[];
  matchMode: MatchMode;
  caseSensitive: boolean;
  points: number;
}

export interface CandidateResponse {
  questionId: string;
  response: unknown;
}

export interface ObjectiveScoreResult {
  rawCorrect: number;
  total: number;
  perQuestion: Record<string, boolean>;
}

export function normalizeResponse(value: string, caseSensitive: boolean): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

export function isResponseCorrect(key: KeyedAnswer, response: CandidateResponse): boolean {
  const value = response.response;
  if (value === null || value === undefined) return false;

  if (Array.isArray(value)) {
    const got = new Set(value.map((v) => normalizeResponse(String(v), key.caseSensitive)));
    const want = new Set(key.accepted.map((a) => normalizeResponse(a, key.caseSensitive)));
    if (got.size !== want.size) return false;
    for (const w of want) if (!got.has(w)) return false;
    return true;
  }

  const candidate = normalizeResponse(String(value), key.caseSensitive);
  return key.accepted.some((accepted) => {
    const target = normalizeResponse(accepted, key.caseSensitive);
    if (target.length === 0) return false;
    if (key.matchMode === "REGEX") {
      try {
        return new RegExp(accepted, key.caseSensitive ? "" : "i").test(String(value).trim());
      } catch {
        return candidate === target;
      }
    }
    if (key.matchMode === "CONTAINS") return candidate === target || candidate.includes(target);
    return candidate === target;
  });
}

export function scoreObjectiveSection(
  keys: KeyedAnswer[],
  responses: CandidateResponse[]
): ObjectiveScoreResult {
  const byQuestion = new Map(responses.map((r) => [r.questionId, r]));
  const perQuestion: Record<string, boolean> = {};
  let rawCorrect = 0;
  let total = 0;

  for (const key of keys) {
    total += key.points;
    const response = byQuestion.get(key.questionId);
    const correct = response ? isResponseCorrect(key, response) : false;
    perQuestion[key.questionId] = correct;
    if (correct) rawCorrect += key.points;
  }

  return { rawCorrect, total, perQuestion };
}
