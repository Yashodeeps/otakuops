// xAI (Grok) client. The xAI API is OpenAI-compatible, so we use the openai SDK
// pointed at api.x.ai. Model is env-overridable — set XAI_MODEL to whatever your
// account has (e.g. grok-4). Get a key at console.x.ai.
import OpenAI from "openai";

export function xaiClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
  });
}

// Ask companion — quality matters, reasoning is fine.
export const XAI_MODEL = process.env.XAI_MODEL ?? "grok-4.5";

// Parser — a simple structured task run on big lists, so use a fast NON-reasoning
// model. grok-4.5 (reasoning) takes ~70s on a 150-title list and times out;
// the non-reasoning model does the same in ~29s with no reasoning-token cost.
export const XAI_PARSE_MODEL = process.env.XAI_PARSE_MODEL ?? "grok-4.20-0309-non-reasoning";
