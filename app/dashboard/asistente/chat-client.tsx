"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendAssistantMessage, type ChatMessage } from "@/lib/actions/assistant";
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function handleSend() {
    const text = input.trim();
    if (!text || pending) return;
    setError(null);
    setInput("");

    const optimistic: ChatMessage = {
      id: `optimistic-${Date.now()}`,
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
          <p className="text-sm text-ink-dim m-auto text-center max-w-sm">
            Cuéntame cómo vas — con tu agencia VANT, con tus metas personales, o qué tienes en la cabeza hoy.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === "user" ? "bg-ink text-bg" : "bg-surface-2 text-ink border border-border"
                }`}
              >
                {m.content}
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
        <Button onClick={handleSend} disabled={pending || !input.trim()} size="md">
          <Send size={15} />
          Enviar
        </Button>
      </div>
    </div>
  );
}
