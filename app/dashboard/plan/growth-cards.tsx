import { Activity, Milestone } from "lucide-react";
import { BOTTLENECK_LABEL, type BottleneckResult } from "@/lib/engine/bottleneck";
import type { PlanPhases } from "@/lib/engine/plan30";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PHASE_TONE = { done: "neutral", active: "good", upcoming: "neutral", skipped: "neutral" } as const;
const PHASE_STATUS = { done: "terminada", active: "activa", upcoming: "próxima", skipped: "omitida" } as const;

/** Cuello de botella actual en formato OBSERVACIÓN → HIPÓTESIS → ACCIÓN → MÉTRICA → DECISIÓN. */
export function BottleneckCard({ bottleneck }: { bottleneck: BottleneckResult }) {
  const { top } = bottleneck;
  return (
    <Card className="mb-6">
      <CardHeader
        title="Cuello de botella (últimos 7 días)"
        icon={<Activity size={16} className="text-ink-dim" />}
        action={top ? <Badge tone="warn">{BOTTLENECK_LABEL[top.kind]}</Badge> : undefined}
      />
      <div className="px-5 pb-5 text-sm">
        {!top ? (
          <p className="text-ink-dim">
            {bottleneck.missingData.length > 0
              ? "Sin diagnóstico: todavía no hay muestra suficiente. No se infiere una causa sin datos."
              : "No hay etapas por debajo de su referencia."}
          </p>
        ) : (
          <dl className="grid grid-cols-1 gap-2">
            <Row term="Observación (dato)">{top.observation}</Row>
            <Row term="Hipótesis (no comprobadas)">
              <ul className="list-disc pl-4">
                {top.hypotheses.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </Row>
            <Row term="Acción">{top.action}</Row>
            <Row term="Métrica">{top.metric}</Row>
            <Row term="Decisión">Mantener o cambiar según el resultado del experimento, con la muestra completa.</Row>
          </dl>
        )}
        {bottleneck.volumeDownConversionUp && (
          <p className="mt-3 text-xs text-ink-dim">
            El volumen bajó pero la conversión a citas subió: no se recomienda &quot;enviar más&quot; mientras exista otro cuello de botella.
          </p>
        )}
        {bottleneck.findings.length > 1 && (
          <p className="mt-3 text-xs text-ink-dim">
            Otros hallazgos: {bottleneck.findings.slice(1).map((f) => BOTTLENECK_LABEL[f.kind]).join(", ")}.
          </p>
        )}
        {bottleneck.missingData.length > 0 && (
          <details className="mt-3 text-xs text-ink-dim">
            <summary className="cursor-pointer select-none">Datos que faltan para diagnosticar</summary>
            <ul className="list-disc pl-5 mt-1">
              {bottleneck.missingData.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Card>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-1">
      <dt className="text-xs text-ink-dim">{term}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

/** Fases del plan con fechas calculadas (no fijas). */
export function PlanPhasesCard({ phases }: { phases: PlanPhases }) {
  return (
    <Card className="mb-6">
      <CardHeader title="Fases del plan" icon={<Milestone size={16} className="text-ink-dim" />} />
      <ul className="px-5 pb-4 flex flex-col gap-3">
        {phases.phases.map((p) => (
          <li key={p.key} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">{p.label}</span>
              <span className="flex items-center gap-2 text-xs text-ink-dim tabular-nums">
                {p.status !== "skipped" && `${p.start} → ${p.end}`}
                <Badge tone={PHASE_TONE[p.status]}>{PHASE_STATUS[p.status]}</Badge>
              </span>
            </div>
            <p className="text-xs text-ink-dim mt-0.5">Foco: {p.focus.join(", ")}</p>
            <p className="text-xs text-ink-dim">Salida: {p.exitCriteria}</p>
          </li>
        ))}
      </ul>
      {phases.checkpoints.length > 0 && (
        <p className="px-5 pb-4 text-xs text-ink-dim">
          Checkpoints de revisión: {phases.checkpoints.slice(0, 6).join(", ")}
          {phases.checkpoints.length > 6 ? "…" : ""}
        </p>
      )}
      <details className="px-5 pb-4 text-xs text-ink-dim">
        <summary className="cursor-pointer select-none">Cómo se calcularon las fases</summary>
        <ul className="list-disc pl-5 mt-1">
          {phases.trace.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
