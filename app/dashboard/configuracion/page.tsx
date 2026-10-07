import { ListOrdered } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TASK_LEVER_LABEL, type TaskLever } from "@/lib/tasks";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RuleForm, RuleArchive, StarterRules } from "./forms";

/**
 * Configuración: reglas de prioridad (B-1). Definen el P0/P1/P2 SUGERIDO de las
 * tareas a partir de su sistema y palanca. Tú puedes sobrescribir cualquier
 * tarea; la sugerencia original se conserva.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: rules, error }, { data: systems }] = await Promise.all([
    supabase.from("priority_rules").select("id, system_id, lever, tier, note").is("archived_at", null).order("tier"),
    supabase.from("systems").select("id, title").is("archived_at", null).order("title"),
  ]);
  const systemTitle = new Map((systems ?? []).map((s) => [s.id as string, s.title as string]));

  return (
    <main className="flex-1 px-4 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Configuración</h1>
        <p className="text-sm text-ink-dim mt-1">Cómo el sistema decide qué es P0, P1 y P2. Son datos: cámbialos cuando cambie tu estrategia.</p>
      </div>

      <Card>
        <CardHeader title="Reglas de prioridad" icon={<ListOrdered size={16} className="text-ink-dim" />} />
        <div className="px-5 pb-5 flex flex-col gap-4">
          <div className="text-xs text-ink-dim flex flex-col gap-1">
            <p>
              <strong className="text-ink">P0</strong> — no hacerlo compromete directamente el resultado actual. <strong className="text-ink">P1</strong> — sostiene o
              mejora el resultado. <strong className="text-ink">P2</strong> — útil, no crítico ahora.
            </p>
            <p>Orden: plan aprobado → rutina → regla (sistema + palanca, luego palanca, luego sistema) → aporta a la meta (P1) → sin vínculo (P2). P0 solo sale de una regla, rutina o plan.</p>
          </div>

          {error ? (
            <p className="text-sm text-warn">No se pudieron leer las reglas ({error.message}). ¿Aplicaste la migración 0021?</p>
          ) : (rules ?? []).length === 0 ? (
            <EmptyState title="Sin reglas" description="Sin reglas, solo las rutinas y los planes marcan P0. Puedes cargar las sugeridas y editarlas." action={<StarterRules />} />
          ) : (
            <ul className="flex flex-col gap-2">
              {(rules ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-ink">
                      <Badge tone={r.tier === "p0" ? "ink" : "neutral"}>{String(r.tier).toUpperCase()}</Badge>
                      {r.lever ? (TASK_LEVER_LABEL[r.lever as TaskLever] ?? r.lever) : "Cualquier palanca"}
                      {r.system_id ? ` · ${systemTitle.get(r.system_id) ?? "sistema"}` : ""}
                    </div>
                    {r.note && <div className="text-xs text-ink-dim">{r.note}</div>}
                  </div>
                  <RuleArchive id={r.id} />
                </li>
              ))}
            </ul>
          )}

          <details className="border-t border-border pt-3">
            <summary className="cursor-pointer select-none text-xs font-medium text-ink">Agregar regla</summary>
            <div className="mt-3">
              <RuleForm systems={(systems ?? []) as { id: string; title: string }[]} />
            </div>
          </details>
          {(rules ?? []).length > 0 && (
            <div className="border-t border-border pt-3">
              <StarterRules />
            </div>
          )}
        </div>
      </Card>
    </main>
  );
}
