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

export const XAI_MODEL = process.env.XAI_MODEL ?? "grok-4.5";
