import Anthropic from "@anthropic-ai/sdk";

export const ASSISTANT_MODEL = "claude-sonnet-5";

let client: Anthropic | null = null;

/**
 * Server-only — ANTHROPIC_API_KEY nunca lleva prefijo NEXT_PUBLIC_.
 * Perezoso: `new Anthropic()` lanza si falta la key, y hacerlo al importar
 * el módulo tumbaba la página entera en vez de solo el asistente.
 */
export function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}
