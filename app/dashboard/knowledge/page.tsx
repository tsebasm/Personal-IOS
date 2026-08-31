import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteNote } from "@/lib/actions/knowledge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { CreateNoteButton } from "./create-button";
import { EditNoteButton } from "./edit-button";

const KIND_LABEL: Record<string, string> = {
  concepto: "Concepto",
  libro: "Libro",
  curso: "Curso",
  recurso: "Recurso",
  framework: "Framework",
  decision: "Decisión",
};

export default async function KnowledgePage() {
  const supabase = await createClient();
  const [{ data: notesData }, { data: itemsData }] = await Promise.all([
    supabase.from("notes").select("id, title, body, category, created_at").order("created_at", { ascending: false }),
    supabase
      .from("knowledge_items")
      .select("id, title, kind, description, created_at")
      .order("created_at", { ascending: false }),
  ]);

  type Entry = {
    id: string;
    title: string;
    tag: string;
    created_at: string;
    note?: { id: string; title: string; body: string | null; category: string | null };
  };
  const entries: Entry[] = [
    ...(notesData ?? []).map((n) => ({
      id: `note-${n.id}`,
      title: n.title || "Nota sin título",
      tag: n.category || "Nota",
      created_at: n.created_at,
      note: { id: n.id, title: n.title || "", body: n.body, category: n.category },
    })),
    ...(itemsData ?? []).map((k) => ({
      id: `item-${k.id}`,
      title: k.title,
      tag: KIND_LABEL[k.kind] ?? k.kind,
      created_at: k.created_at,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Conocimiento</h1>
          <p className="text-sm text-ink-dim mt-1">Tu segundo cerebro: notas, ideas, libros y decisiones.</p>
        </div>
        <CreateNoteButton />
      </div>

      <Card>
        {entries.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={20} />}
            title="Aún no has guardado nada"
            description="Captura una idea, un concepto o una decisión importante."
            action={<CreateNoteButton />}
          />
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="text-sm text-ink truncate">{e.title}</span>
                <div className="flex items-center gap-2.5 flex-none">
                  <Badge tone="neutral">{e.tag}</Badge>
                  {e.note && (
                    <>
                      <EditNoteButton note={e.note} />
                      <DeleteButton
                        action={deleteNote.bind(null, e.note.id)}
                        confirmMessage={`¿Eliminar la nota "${e.title}"?`}
                      />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
