import { Sparkles } from "lucide-react";
import { loadConversation } from "@/lib/actions/assistant";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChatClient } from "./chat-client";

export default async function AsistentePage() {
  const result = await loadConversation();

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Asistente</h1>
        <p className="text-sm text-ink-dim mt-1">
          Habla de tu situación actual — personal o de VANT. Solo usa lo que ya está en tu sistema; si algo falta, te lo dice.
        </p>
      </div>

      {"error" in result ? (
        <Card className="px-6 py-10">
          <EmptyState icon={<Sparkles size={20} />} title="No se pudo cargar el asistente" description={result.error} />
        </Card>
      ) : (
        <ChatClient conversationId={result.conversationId} initialMessages={result.messages} />
      )}
    </main>
  );
}
