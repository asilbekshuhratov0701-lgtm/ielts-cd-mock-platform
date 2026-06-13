/**
 * Anthropic Claude adapter (stub).
 *
 * The real implementation will use `@anthropic-ai/sdk` with tool-use / structured
 * outputs against a strict exam schema, vision for scanned docs/images, and section
 * chunking for accuracy + cost. Models come from env:
 *   AI_MODEL_PRIMARY=claude-opus-4-8   AI_MODEL_FAST=claude-sonnet-4-6
 */
import type {
  AIModelConfig,
  AIProvider,
  AIProviderName,
  CorrectionSuggestion,
  DetectedQuestionGroup,
  DocumentInput,
  ExtractedExam
} from "../provider";

export class ClaudeProvider implements AIProvider {
  readonly name: AIProviderName = "anthropic";

  constructor(
    private readonly apiKey: string,
    private readonly models: AIModelConfig
  ) {}

  async analyzeDocument(_input: DocumentInput, _signal?: AbortSignal): Promise<ExtractedExam> {
    throw new Error("Not implemented: ClaudeProvider.analyzeDocument");
  }

  async detectQuestionTypes(
    _input: DocumentInput,
    _signal?: AbortSignal
  ): Promise<DetectedQuestionGroup[]> {
    throw new Error("Not implemented: ClaudeProvider.detectQuestionTypes");
  }

  async extractExam(_inputs: DocumentInput[], _signal?: AbortSignal): Promise<ExtractedExam> {
    throw new Error("Not implemented: ClaudeProvider.extractExam");
  }

  async suggestCorrections(
    _exam: ExtractedExam,
    _signal?: AbortSignal
  ): Promise<CorrectionSuggestion[]> {
    throw new Error("Not implemented: ClaudeProvider.suggestCorrections");
  }
}
