import { FileText, GitPullRequest, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { isoDateInTimezone } from "@/lib/date";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GoalChangeForm, ImportPlanForm, SetActions } from "./forms";

/**
 * Cambios: la revisión humana de los paquetes de cambios (C-3). Nada
 * estratégico entra al sistema sin pasar por aquí: propuesta → aprobación
 * del usuario → aplicación → decisión registrada.
 */

const STATUS: Record<string, { label: string; tone: "neutral" | "good" | "warn" | "bad" | "ink" }> = {
  draft: { label: "Borrador", tone: "neutral" },
  proposed: { label: "Pendiente de tu revisión", tone: "warn" },
  approved: { label: "Aprobado · sin aplicar", tone: "ink" },
  partially_approved: { label: "Aprobado en parte · sin aplicar", tone: "ink" },
  rejected: { label: "Rechazado", tone: "neutral" },
  applied: { label: "Aplicado", tone: "good" },
  failed: { label: "Falló (nada cambió)", tone: "bad" },
};
const ACTOR: Record<string, string> = { user: "tú", claude: "Claude", system: "el sistema" };
const OP: Record<string, string> = { create: "Crear", update: "Modificar", archive: "Archivar" };

type SetRow = {
  id: string;
  title: string;
  kind: string;
  status: string;
  proposed_by: string;
  rationale: string | null;
  failure_reason: string | null;
  created_at: string;
  decision: { number: number; title: string; status: string } | null;
  plan_import: { interpreter: string; questions: { id: string; question: string }[]; inconsistencies: { code: string; message: string }[] } | null;
  change_items: { seq: number; op: string; entity_type: string; payload: Record<string, unknown>; status: string; sensitivity: string }[];
};

export default async function ChangesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const [{ data: sets, error }, { data: prof }] = await Promise.all([
    supabase
      .from("change_sets")
      .select(
        "id, title, kind, status, proposed_by, rationale, failure_reason, created_at, decision:decisions!change_sets_decision_id_fkey(number, title, status), plan_import:plan_imports(interpreter, questions, inconsistencies), change_items(seq, op, entity_type, payload, status, sensitivity)"
      )
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("profiles").select("north_star_goal_id").eq("id", profile?.userId ?? "").maybeSingle(),
  ]);
  const goalId = (prof?.north_star_goal_id as string | null) ?? null;
  const today = isoDateInTimezone(profile?.timezone ?? "America/Bogota");
  const { data: goal } = goalId
    ? await supabase.from("goals").select("*").eq("id", goalId).maybeSingle()
    : { data: null };

  return (
    <main className="flex-1 px-4 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Cambios</h1>
        <p className="text-sm text-ink-dim mt-1">Propuestas que esperan tu aprobación. Nada estratégico cambia sin pasar por aquí.</p>
      </div>

      <div className="flex flex-col gap-4">
        {goal && (
          <Card>
            <CardHeader title="Meta principal" icon={<Lock size={16} className="text-ink-dim" />} />
            <div className="px-5 pb-5">
              <p className="text-sm text-ink mb-1">
                {goal.title} — {Number(goal.target_value).toLocaleString("es-CO")} {goal.currency ?? goal.unit} · {goal.deadline}
              </p>
              <p className="text-xs text-ink-dim mb-4">
                {goal.locked_at ? `Bloqueada desde ${String(goal.locked_at).slice(0, 10)} (versión ${goal.version}).` : "Aún sin bloquear: el primer cambio aprobado la bloquea."}{" "}
                Cambiarla exige un motivo y queda como decisión (§11).
              </p>
              <details>
                <summary className="cursor-pointer select-none text-xs font-medium text-ink">Proponer un cambio de meta</summary>
                <div className="mt-3">
                  <GoalChangeForm
                    goalId={goal.id}
                    defaults={{ title: "", unit: goal.currency ?? goal.unit ?? "", currency: goal.currency ?? "", deadline: goal.deadline ?? "", startDate: goal.start_date ?? today }}
                  />
                </div>
              </details>
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="Importar un plan" icon={<FileText size={16} className="text-ink-dim" />} />
          <div className="px-5 pb-5">
            <details>
              <summary className="cursor-pointer select-none text-xs font-medium text-ink">Pegar un plan, hipótesis o estrategia</summary>
              <div className="mt-3">
                <ImportPlanForm />
              </div>
            </details>
          </div>
        </Card>

        <Card>
          <CardHeader title="Paquetes de cambios" icon={<GitPullRequest size={16} className="text-ink-dim" />} />
          {error ? (
            <p className="px-5 pb-5 text-sm text-warn">No se pudieron leer los cambios ({error.message}). ¿Faltan las migraciones 0018/0019?</p>
          ) : (sets ?? []).length === 0 ? (
            <EmptyState title="Sin propuestas" description="Cuando tú o Claude propongan cambios, aparecerán aquí para tu revisión." />
          ) : (
            <ul className="px-5 pb-5 flex flex-col gap-4">
              {((sets ?? []) as unknown as SetRow[]).map((s) => {
                const st = STATUS[s.status] ?? { label: s.status, tone: "neutral" as const };
                return (
                  <li key={s.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-ink">{s.title}</span>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {s.kind === "goal_change" && <Badge tone="ink">Cambio de meta</Badge>}
                    </div>
                    <p className="text-xs text-ink-dim mb-2">
                      Propuesto por {ACTOR[s.proposed_by] ?? s.proposed_by} · {s.created_at.slice(0, 10)}
                      {s.decision && ` · Decisión #${String(s.decision.number).padStart(3, "0")} (${s.decision.status})`}
                    </p>
                    {s.rationale && <p className="text-xs text-ink mb-2">{s.rationale}</p>}
                    {s.plan_import && (s.plan_import.questions.length > 0 || s.plan_import.inconsistencies.length > 0) && (
                      <ul className="mb-2 flex flex-col gap-0.5 text-xs text-warn">
                        {s.plan_import.questions.map((q) => (
                          <li key={q.id}>Pregunta: {q.question}</li>
                        ))}
                        {s.plan_import.inconsistencies.map((i, k) => (
                          <li key={k}>Aviso: {i.message}</li>
                        ))}
                      </ul>
                    )}
                    <ul className="mb-3 flex flex-col gap-1">
                      {[...s.change_items].sort((a, b) => a.seq - b.seq).map((it) => (
                        <li key={it.seq} className="text-xs text-ink-dim">
                          <span className="text-ink">
                            {OP[it.op] ?? it.op} {it.entity_type}
                          </span>
                          {it.sensitivity !== "normal" && ` · ${it.sensitivity === "locked" ? "bloqueado" : "estratégico"}`} ·{" "}
                          <code className="break-all">{JSON.stringify(it.payload)}</code>
                        </li>
                      ))}
                    </ul>
                    {s.failure_reason && <p className="text-xs text-warn mb-2">Motivo del fallo: {s.failure_reason}</p>}
                    <SetActions id={s.id} status={s.status} kind={s.kind} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
