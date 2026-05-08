import Anthropic from "@anthropic-ai/sdk";

// Use a placeholder so the SDK doesn't throw at import time when the key is absent.
// generateDailyReport checks the env var before making actual API calls.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "not-configured",
});
