/** Provider factory — selects an AI adapter from configuration (defaults to Claude). */
import type { AIModelConfig, AIProvider, AIProviderName } from "../provider";
import { ClaudeProvider } from "./claude";

export interface AIConfig {
  provider: AIProviderName;
  apiKey: string;
  models: AIModelConfig;
}

export function getAIProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case "anthropic":
      return new ClaudeProvider(config.apiKey, config.models);
    // case "openai": return new OpenAIProvider(...);  // future adapter
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

export { ClaudeProvider };
