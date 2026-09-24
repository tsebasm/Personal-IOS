import { FlaskConical } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { deleteExperiment } from "@/lib/actions/experiments";
import { isoDateInTimezone } from "@/lib/date";
import { experimentResults } from "@/lib/engine/experiments";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AgenciaTabs } from "../tabs";
import { CreateExperimentButton, EditExperimentButton, METRIC_LABEL, type Experiment } from "./experiment-form";

const DECISION_LABEL: Record<string, string> = { keep: "Mantener", change: "Cambiar", inconclusive: "No concluyente" };
const ratio = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);

export default async function ExperimentsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const today = isoDateInTimezone(profile?.timezone ?? "America/Bogota");

  const [{ data: expData }, { data: hypothesesData }, { data: sessionsData }] = await Promise.all([
    supabase
      .from("experiments")
      .select("id, name, hypothesis_id, metric_key, variants, sample_target, started_on, ended_on, status, decision, learning")
      .order("created_at", { ascending: false }),
    supabase.from("hypotheses").select("id, statement").order("created_at", { ascending: false }),
    supabase
      .from("prospecting_sessions")
      .select(
        "experiment_id, message_variant, contacts_count, replies_count, appointments_count, shows_count, proposals_count, followups_count, clients_closed, minutes_spent"
      )
      .not("experiment_id", "is", null),
  ]);
  const experiments = (expData ?? []) as Experiment[];
  const hypotheses = hypothesesData ?? [];
  const statement = new Map(hypotheses.map((h) => [h.id, h.statement]));

  return (
    <main className="flex-1 px-4 md:px-8 py-6 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Agencia</h1>
          <p className="text-sm text-ink-dim mt-1">
            Hipótesis → experimento → dato → aprendizaje. Los resultados salen de las sesiones atribuidas a cada variante.
          </p>
        </div>
        <CreateExperimentButton hypotheses={hypotheses} today={today} />
      </div>

      <AgenciaTabs />

      {experiments.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<FlaskConical size={20} />}
            title="Sin experimentos"
            description="Crea uno (p. ej. dos mensajes) y atribuye cada sesión de prospección al experimento y a su variante."
            action={<CreateExperimentButton hypotheses={hypotheses} today={today} />}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {experiments.map((e) => {
            const res = experimentResults(
              e.metric_key,
              e.variants,
              (sessionsData ?? []).filter((s) => s.experiment_id === e.id),
              e.sample_target
            );
            return (
              <Card key={e.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink">{e.name}</div>
                    <div className="text-xs text-ink-dim">
                      {METRIC_LABEL[e.metric_key]} · muestra {e.sample_target}/variante · desde {e.started_on}
                      {e.hypothesis_id && statement.get(e.hypothesis_id) ? ` · ${statement.get(e.hypothesis_id)!.slice(0, 60)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-none">
                    <Badge tone={e.status === "running" ? "warn" : "good"}>
                      {e.status === "running" ? "En curso" : DECISION_LABEL[e.decision ?? ""] ?? "Terminado"}
                    </Badge>
                    <EditExperimentButton experiment={e} hypotheses={hypotheses} today={today} />
                    <DeleteButton action={deleteExperiment.bind(null, e.id)} confirmMessage={`¿Eliminar "${e.name}"?`} />
                  </div>
                </div>
                <ul className="flex flex-col gap-2 mt-3">
                  {res.variants.map((v) => (
                    <li key={v.variant} className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-ink">
                          Variante {v.variant}
                          {res.leader === v.variant && <Badge tone="good" className="ml-1.5">líder</Badge>}
                        </span>
                        <span className="text-ink-dim tabular-nums">
                          {ratio(v.rate)} · n={v.n}/{e.sample_target}
                        </span>
                      </div>
                      <ProgressBar value={Math.min(100, (v.n / e.sample_target) * 100)} />
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-ink-dim mt-2">
                  {res.leader
                    ? "Todas las variantes alcanzaron la muestra: la diferencia ya es un dato."
                    : "Muestra insuficiente: cualquier diferencia todavía es ruido, no conclusión."}
                  {res.unassigned > 0 && ` ${res.unassigned} sesión(es) del experimento sin variante válida.`}
                </p>
                {e.learning && <p className="text-xs text-ink mt-2">Aprendizaje: {e.learning}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
