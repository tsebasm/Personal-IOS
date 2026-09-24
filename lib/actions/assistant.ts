"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildMasterContext } from "@/lib/ai/context";
import { buildContextPrompt, buildRules, parseMessageType } from "@/lib/ai/prompt";
import { buildEngineContext } from "@/lib/ai/engine-context";
import { getAnthropic, ASSISTANT_MODEL } from "@/lib/ai/client";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  message_type: string | null;
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

/** Últimos N mensajes que se envían al modelo: el costo/latencia no crece sin cota con la conversación. */
const HISTORY_LIMIT = 20;
/** Tope de mensajes del usuario por minuto (evita loops de UI que disparen costo). */
const RATE_LIMIT_PER_MINUTE = 6;

export async function sendAssistantMessage(conversationId: string, text: string): Promise<SendMessageResult> {
  const message = text.trim();
  if (!message) return { ok: false, error: "Escribe algo antes de enviar." };
  if (message.length > 4000) return { ok: false, error: "Mensaje demasiado largo (máx. 4000 caracteres)." };
  const anthropic = getAnthropic();
  if (!anthropic) {
    return { ok: false, error: "Falta ANTHROPIC_API_KEY en el entorno (.env.local o Vercel)." };
  }

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

  const { count: recent } = await supabase
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((recent ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    return { ok: false, error: "Demasiados mensajes en un minuto. Espera un momento." };
  }

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

  const { data: latest, error: historyErr } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (historyErr) return { ok: false, error: "No pudimos leer el historial." };
  // La API exige empezar con un mensaje del usuario.
  const history = (latest ?? []).reverse();
  while (history.length > 0 && history[0].role !== "user") history.shift();

  const [context, engineContext] = await Promise.all([
    buildMasterContext(supabase, user.id, profile?.timezone ?? "America/Bogota", profile?.full_name ?? null),
    buildEngineContext(),
  ]);

  let rawText: string;
  try {
    const response = await anthropic.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: 4000,
      // Reglas (estables) + contexto (cambia con los datos). El breakpoint va al final
      // del system para que turnos seguidos del mismo chat reutilicen el prefijo cacheado.
      system: [
        { type: "text", text: buildRules(context) },
        { type: "text", text: buildContextPrompt(context, engineContext), cache_control: { type: "ephemeral" } },
      ],
      messages: history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });
    if (response.stop_reason === "refusal") {
      return { ok: false, error: "El asistente no pudo responder a este mensaje. Reformúlalo." };
    }
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    rawText = textBlock?.text ?? "No pude generar una respuesta.";
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "ANTHROPIC_API_KEY inválida o ausente." };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Límite de la API alcanzado — intenta de nuevo en un momento." };
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, error: `Error de la API de Claude: ${err.message}` };
    }
    return { ok: false, error: "No pudimos contactar al asistente." };
  }

  const { type, body } = parseMessageType(rawText);
  const row = { conversation_id: conversationId, role: "assistant", content: body || rawText, message_type: type };
  let { error: insertAssistantErr } = await supabase.from("ai_messages").insert(row);
  // Sin la migración 0016 el check solo admite los tipos viejos: guardar sin tipo antes que perder la respuesta.
  if (insertAssistantErr?.code === "23514") {
    ({ error: insertAssistantErr } = await supabase.from("ai_messages").insert({ ...row, message_type: null }));
  }
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

/**
 * Borra el historial de esta conversación (pedido explícito del usuario
 * desde la UI). Solo mensajes del chat; no toca metas ni datos.
 */
export async function clearConversation(conversationId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  const { error } = await supabase
    .from("ai_messages")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "No pudimos borrar el historial." };
  revalidatePath("/dashboard/asistente");
  return { ok: true };
}
