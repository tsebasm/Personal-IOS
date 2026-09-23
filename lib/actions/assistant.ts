"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildMasterContext } from "@/lib/ai/context";
import { buildSystemPrompt } from "@/lib/ai/prompt";
import { anthropic, ASSISTANT_MODEL } from "@/lib/ai/client";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  message_type: "hecho" | "inferencia" | "recomendacion" | null;
  created_at: string;
};

export type SendMessageResult =
  | { ok: true; conversationId: string; messages: ChatMessage[] }
  | { ok: false; error: string };

/** Última conversación de tipo 'chat', o crea una nueva si no hay ninguna. */
async function getOrCreateConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ id: string } | { error: string }> {
  const { data: existing } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "chat")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return { id: existing.id };

  const { data: created, error } = await supabase
    .from("ai_conversations")
    .insert({ type: "chat" })
    .select("id")
    .single();
  if (error || !created) return { error: "No pudimos iniciar la conversación." };
  return { id: created.id };
}

export async function loadConversation(): Promise<
  { conversationId: string; messages: ChatMessage[] } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión." };

  const conv = await getOrCreateConversation(supabase, user.id);
  if ("error" in conv) return conv;

  const { data: messages, error } = await supabase
    .from("ai_messages")
    .select("id, role, content, message_type, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true });
  if (error) return { error: "No pudimos cargar el historial." };

  return { conversationId: conv.id, messages: (messages ?? []) as ChatMessage[] };
}

export async function sendAssistantMessage(conversationId: string, text: string): Promise<SendMessageResult> {
  const message = text.trim();
  if (!message) return { ok: false, error: "Escribe algo antes de enviar." };
  if (message.length > 4000) return { ok: false, error: "Mensaje demasiado largo (máx. 4000 caracteres)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conversation) return { ok: false, error: "Conversación inválida." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, timezone")
    .eq("id", user.id)
    .maybeSingle();

  const { error: insertUserErr } = await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: message,
  });
  if (insertUserErr) return { ok: false, error: "No pudimos guardar tu mensaje." };

  const { data: history, error: historyErr } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (historyErr) return { ok: false, error: "No pudimos leer el historial." };

  const context = await buildMasterContext(
    supabase,
    user.id,
    profile?.timezone ?? "America/Bogota",
    profile?.full_name ?? null
  );
  const systemPrompt = buildSystemPrompt(context);

  let assistantText: string;
  try {
    const response = await anthropic.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: (history ?? []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    assistantText = textBlock?.text ?? "No pude generar una respuesta.";
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "ANTHROPIC_API_KEY inválida o ausente en .env.local." };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Límite de la API alcanzado — intenta de nuevo en un momento." };
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, error: `Error de la API de Claude: ${err.message}` };
    }
    return { ok: false, error: "No pudimos contactar al asistente." };
  }

  const { error: insertAssistantErr } = await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: assistantText,
  });
  if (insertAssistantErr) return { ok: false, error: "La respuesta llegó pero no se pudo guardar." };

  await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  const { data: messages, error: reloadErr } = await supabase
    .from("ai_messages")
    .select("id, role, content, message_type, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (reloadErr) return { ok: false, error: "Respuesta guardada, pero no pudimos recargar el chat." };

  revalidatePath("/dashboard/asistente");
  return { ok: true, conversationId, messages: (messages ?? []) as ChatMessage[] };
}
