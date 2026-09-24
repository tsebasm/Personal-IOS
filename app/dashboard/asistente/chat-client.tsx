"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, Trash2 } from "lucide-react";
import { clearConversation, sendAssistantMessage, type ChatMessage } from "@/lib/actions/assistant";
import { Badge } from "@/components/ui/badge";

const TYPE_LABEL: Record<string, string> = {
  dato: "DATO",
  suposicion: "SUPOSICIÓN",
  hipotesis: "HIPÓTESIS",
  decision: "DECISIÓN",
  resultado: "RESULTADO",
  recomendacion: "RECOMENDACIÓN",
  hecho: "DATO",
  inferencia: "INFERENCIA",
};

/** Las preguntas que el sistema debe poder responder con datos (especificación). */
const SUGGESTED = [
  "¿Qué debo hacer hoy y por qué?",
  "¿Qué métrica está bloqueando mi objetivo?",
  "¿Qué cambió esta semana?",
  "¿Qué hipótesis deberíamos probar?",
  "¿Estoy ejecutando el plan?",
  "¿Qué estoy evitando?",
];
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatClient({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const optimisticSeq = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function handleClear() {
    if (pending || !confirm("¿Borrar todo el historial de esta conversación?")) return;
    startTransition(async () => {
      const res = await clearConversation(conversationId);
      if (res.ok) setMessages([]);
      else setError(res.error ?? "No pudimos borrar el historial.");
    });
  }

  function handleSend(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || pending) return;
    setError(null);
    setInput("");

    const optimistic: ChatMessage = {
      id: `optimistic-${(optimisticSeq.current += 1)}`,
      role: "user",
      content: text,
      message_type: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      const result = await sendAssistantMessage(conversationId, text);
      if (!result.ok) {
        setError(result.error);
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInput(text);
        return;
      }
      setMessages(result.messages);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col rounded-card border border-border bg-surface">
      <div className="h-[55vh] min-h-[320px] overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="m-auto text-center max-w-md">
            <p className="text-sm text-ink-dim mb-3">
              Responde con los datos de tu sistema (plan, prioridades, cuello de botella). Si falta un dato, te dice cuál.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-ink hover:bg-surface-2"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "bg-ink text-bg" : "bg-surface-2 text-ink border border-border"
                }`}
              >
                {m.role === "assistant" && m.message_type && TYPE_LABEL[m.message_type] && (
                  <Badge tone="neutral" className="mb-1.5">
                    {TYPE_LABEL[m.message_type]}
                  </Badge>
                )}
                <div>{m.content}</div>
              </div>
            </div>
          ))
        )}
        {pending && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3.5 py-2.5 text-sm bg-surface-2 border border-border text-ink-dim">
              Pensando…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="px-5 pb-2 text-xs text-bad">{error}</div>}

      <div className="border-t border-border px-4 py-3 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para salto de línea)"
          rows={2}
          className="flex-1"
          disabled={pending}
        />
        <Button variant="ghost" size="md" onClick={handleClear} disabled={pending || messages.length === 0} title="Borrar historial">
          <Trash2 size={15} />
        </Button>
        <Button onClick={() => handleSend()} disabled={pending || !input.trim()} size="md">
          <Send size={15} />
          Enviar
        </Button>
      </div>
    </div>
  );
}
