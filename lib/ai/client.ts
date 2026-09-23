import Anthropic from "@anthropic-ai/sdk";

/** Server-only — ANTHROPIC_API_KEY nunca lleva prefijo NEXT_PUBLIC_. */
export const anthropic = new Anthropic();

export const ASSISTANT_MODEL = "claude-sonnet-5";
