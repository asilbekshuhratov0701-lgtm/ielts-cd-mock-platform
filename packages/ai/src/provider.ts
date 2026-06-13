/**
 * Modular AI provider interface (E14 — swappable adapters).
 * The exam-import pipeline depends only on this interface; concrete providers
 * (Claude today, others later) implement it. Adding a provider = adding an adapter.
 */
import type { QuestionTypeKey } from "@ielts/core";

export type AIProviderName = "anthropic" | "openai" | "mock";

export interface AIModelConfig {
  /** Primary (high-capability) model id, e.g. claude-opus-4-8. */
  primary: string;
  /** Cheaper/faster model id for low-stakes passes, e.g. claude-sonnet-4-6. */
  fast: string;
}

export interface DocumentInput {
  /** Extracted text (rule-based parse or OCR). */
  text?: string;
  /** Image references (R2 keys / signed URLs) for vision analysis of scans & diagrams. */
  imageRefs?: string[];
  mime: string;
  filename?: string;
}

export interface DetectedQuestionGroup {
  type: QuestionTypeKey;
  instructions: string;
  questionNumbers: number[];
  confidence: number;
}

export interface ExtractedExam {
  moduleType: "ACADEMIC" | "GENERAL";
  sections: Array<{
    kind: "LISTENING" | "READING" | "WRITING";
    durationSec: number;
    groups: DetectedQuestionGroup[];
  }>;
  /** Free-form structured payload mapped into staging tables by the pipeline. */
  raw: unknown;
  confidence: number;
}

export interface CorrectionSuggestion {
  kind: string;
  targetRef?: string;
  message: string;
  confidence: number;
}

/**
 * Every method is async and side-effect free w.r.t. the database; the worker pipeline
 * persists results. Implementations should support cancellation via AbortSignal.
 */
export interface AIProvider {
  readonly name: AIProviderName;
  analyzeDocument(input: DocumentInput, signal?: AbortSignal): Promise<ExtractedExam>;
  detectQuestionTypes(input: DocumentInput, signal?: AbortSignal): Promise<DetectedQuestionGroup[]>;
  extractExam(inputs: DocumentInput[], signal?: AbortSignal): Promise<ExtractedExam>;
  suggestCorrections(exam: ExtractedExam, signal?: AbortSignal): Promise<CorrectionSuggestion[]>;
}
