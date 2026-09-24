import Link from "next/link";
import { Crosshair, Target, TrendingDown, AlertTriangle } from "lucide-react";
import { loadPlanContext } from "@/lib/data/plan";
import { money, pct } from "@/lib/format";
import { RATE_SOURCE_LABEL, type RateSource } from "@/lib/engine/rates";
import { FUNNEL_STAGES, FUNNEL_STAGE_LABEL, sensitivity } from "@/lib/engine/reverse";
import type { GapResult } from "@/lib/engine/gap";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { AssumptionsButton, PipelineButton } from "./forms";
import { PlanPhasesCard, BottleneckCard } from "./growth-cards";

const SOURCE_TONE: Record<RateSource, "good" | "warn" | "bad" | "neutral"> = {
  historical: "good",
  estimate: "warn",
  historical_low_n: "warn",
  missing: "bad",
};

const ratio = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const int = (n: number) => Math.round(n).toLocaleString("es-CO");

export default async function PlanPage() {
  const ctx = await loadPlanContext();
  if (!ctx) return null;
  const { plan, assumptions, pipeline, totals, today, bottleneck, phases, pipelineSource } = ctx;

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Plan</h1>
        <p className="text-sm text-ink-dim mt-1">
          Meta → brecha → volumen necesario. Cada número dice si es dato histórico o estimación.
        </p>
      </div>
      <div className="flex gap-2">
        {pipelineSource === "manual" && <PipelineButton pipeline={pipeline} today={today} />}
        <AssumptionsButton assumptions={assumptions} />
      </div>
    </div>
  );

  if (!plan) {
    return (
      <main className="flex-1 px-6 md:px-8 py-6 max-w-4xl w-full mx-auto">
        {header}
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Target size={20} />}
            title="No hay una meta que planear"
            description="Marca una meta como principal (North Star) en Metas, o vincula la meta de facturación en Agencia."
            action={
              <Link href="/dashboard/goals" className="text-sm font-medium text-ink underline underline-offset-2">
                Ir a Metas
              </Link>
            }
          />
        </Card>
      </main>
    );
  }

  const { goal, gap, rates, closes, reverse, reverseInput } = plan;
  const isMoney = (goal.unit ?? "").toUpperCase() === "COP";
  const fmt = (n: number | null) => (n === null ? "—" : isMoney ? money(n) : `${int(n)} ${goal.unit ?? ""}`);
  const replySensitivity =
    reverseInput && reverse?.ok ? sensitivity(reverseInput, "reply", [0.5, 1, 1.5, 2]) : [];

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-4xl w-full mx-auto">
      {header}

      {/* GAP ---------------------------------------------------------------- */}
      <Card className="mb-6">
        <CardHeader
          title={goal.title}
          icon={<Target size={16} className="text-ink-dim" />}
          action={
            <Badge tone="neutral">{ctx.goalSource === "north_star" ? "North Star" : "Meta de VANT"}</Badge>
          }
        />
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between gap-3 mb-1 text-xs text-ink-dim">
            <span>
              {fmt(plan.currentValue)} de {fmt(gap.target)}{" "}
              {plan.currentSource === "billing" && "(calculado de la facturación real)"}
            </span>
            <span className="tabular-nums">{pct(gap.progressPct)}</span>
          </div>
          <ProgressBar value={gap.progressPct ?? 0} className="mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <Stat label="Punto A" value={fmt(gap.baseline)} />
            <Stat label="Falta" value={fmt(gap.remaining)} />
            <Stat label="Días restantes" value={gap.daysLeft === null ? "Sin deadline" : `${gap.daysLeft}`} hint={goal.deadline ?? undefined} />
            <Stat label="Ritmo necesario / día" value={fmt(gap.requiredPerDay)} />
            <Stat
              label="Ritmo real / día"
              value={gap.actualPerDay === null ? "—" : fmt(gap.actualPerDay)}
              hint={gap.actualPerDay === null ? "Falta fecha de inicio o días transcurridos" : undefined}
            />
            <Stat label="Proyección al deadline" value={fmt(gap.projectedAtDeadline)} hint="Lineal, orientativa" />
            <Stat label="Estado" value={gapStatusLabel(gap)} />
          </div>
        </div>
      </Card>

      <BottleneckCard bottleneck={bottleneck} />
      {phases && <PlanPhasesCard phases={phases} />}

      {/* RATES -------------------------------------------------------------- */}
      <Card className="mb-6">
        <CardHeader title="Tasas del embudo" icon={<TrendingDown size={16} className="text-ink-dim" />} />
        <ul className="divide-y divide-border">
          {FUNNEL_STAGES.map((s) => {
            const r = rates[s];
            return (
              <li key={s} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
                <span className="text-sm text-ink">{FUNNEL_STAGE_LABEL[s]}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-ink tabular-nums">{ratio(r.value)}</span>
                  <Badge tone={SOURCE_TONE[r.source]}>{RATE_SOURCE_LABEL[r.source]}</Badge>
                  <span className="text-ink-dim tabular-nums">
                    n={r.n}/{r.minSample}
                    {r.source === "estimate" && r.observed !== null ? ` · observado ${ratio(r.observed)}` : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="px-5 pb-4 pt-2 text-xs text-ink-dim">
          Acumulado registrado: {int(totals.contacts)} contactos · {int(totals.replies)} respuestas · {int(totals.appointments)} citas ·{" "}
          {int(totals.shows)} asistidas · {int(totals.closed)} cierres. Una tasa pasa a HISTÓRICO cuando n alcanza el mínimo.
          {assumptions.source && <> Fuente de las estimaciones: {assumptions.source}.</>}
        </p>
      </Card>

      {/* REVERSE ENGINEERING ------------------------------------------------- */}
      <Card className="mb-6">
        <CardHeader title="Cálculo hacia atrás" icon={<Crosshair size={16} className="text-ink-dim" />} />
        <div className="px-5 pb-5">
          {closes.kind === "unsupported" && <p className="text-sm text-ink-dim">{closes.reason}</p>}
          {closes.kind === "missing" && <MissingData items={closes.missing} />}
          {reverse && !reverse.ok && reverse.missing.length > 0 && <MissingData items={reverse.missing} />}
          {reverse && !reverse.ok && reverse.blocked.length > 0 && (
            <div className="rounded-md bg-bad-bg px-4 py-3 text-sm text-bad">
              <div className="font-medium mb-1">Etapa bloqueada (dato medido)</div>
              <ul className="list-disc pl-5">
                {reverse.blocked.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs">Más volumen no produce cierres: la acción es mejorar esta etapa, no contactar más.</p>
            </div>
          )}

          {reverse?.ok && (
            <>
              {closes.kind === "revenue" && (
                <p className="text-xs text-ink-dim mb-4">
                  Cada cliente nuevo aporta ≈ {money(closes.revenuePerClient)} hasta el deadline (cierre supuesto{" "}
                  {closes.assumedCloseDate}) → se necesitan <strong className="text-ink">{closes.closesNeeded} cliente(s)</strong>.
                </p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs mb-5">
                <Stat label="Contactos nuevos" value={int(reverse.volume.contacts)} />
                <Stat label="Respuestas" value={int(reverse.volume.replies)} />
                <Stat label="Citas agendadas" value={int(reverse.volume.booked)} />
                <Stat label="Citas asistidas" value={int(reverse.volume.shows)} />
                <Stat label="Cierres nuevos" value={reverse.volume.closes.toFixed(2)} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-5">
                <Stat
                  label="Contactos por día"
                  value={reverse.dailyContacts === null ? "—" : int(reverse.dailyContacts)}
                  hint={`${reverse.outreachDays} días de prospección hasta ${reverse.outreachWindowEnd}`}
                  strong
                />
                <Stat
                  label="Minutos por día"
                  value={reverse.dailyMinutes === null ? "—" : int(reverse.dailyMinutes)}
                  hint={reverse.dailyMinutes === null ? "Falta minutos por contacto" : "Capacidad real: Fase 3"}
                />
                <Stat
                  label="Probabilidad con ese volumen"
                  value={`${Math.round(reverse.probabilityAtExpectedVolume * 100)}%`}
                  hint="No es garantía: es el volumen del valor esperado"
                />
                <Stat
                  label="Contactos para 80% / 90%"
                  value={`${int(reverse.contactsForConfidence.p80)} / ${int(reverse.contactsForConfidence.p90)}`}
                />
              </div>

              {reverse.expectedFromPipeline > 0 && (
                <p className="text-xs text-ink-dim mb-4">
                  El pipeline abierto ({pipeline.replied} con respuesta, {pipeline.booked} agendadas, {pipeline.showed} asistidas
                  {pipelineSource === "leads" ? ", desde tus leads" : pipeline.as_of ? `, foto manual al ${pipeline.as_of}` : ""}) aporta ≈ {reverse.expectedFromPipeline.toFixed(2)} cierres esperados.
                </p>
              )}

              {reverse.windowClosed && (
                <p className="rounded-md bg-bad-bg px-4 py-3 text-sm text-bad mb-4">
                  La ventana de prospección ya cerró: con un ciclo de venta de {assumptions.sales_cycle_days} días, un contacto nuevo no alcanza
                  a cerrar antes del deadline. Palancas: acortar el ciclo, trabajar el pipeline existente o mover el deadline.
                </p>
              )}

              {replySensitivity.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-ink-dim mb-2">Sensibilidad a la tasa de respuesta</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {replySensitivity.map((s) => (
                      <div
                        key={s.multiplier}
                        className={`rounded-md border px-3 py-2 text-xs ${s.multiplier === 1 ? "border-ink" : "border-border"}`}
                      >
                        <div className="text-ink-dim">respuesta {ratio(s.rate)}</div>
                        <div className="font-semibold text-ink tabular-nums">
                          {s.dailyContacts === null ? "—" : `${int(s.dailyContacts)}/día`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {reverse && reverse.trace.length > 0 && (
            <details className="text-xs text-ink-dim">
              <summary className="cursor-pointer select-none">Cómo se calculó (trazabilidad)</summary>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                {reverse.trace.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </details>
          )}
        </div>
      </Card>

      {ctx.dailyOutreachTarget?.source === "manual" && reverse?.ok && reverse.dailyContacts !== null && (
        <p className="text-xs text-ink-dim">
          Tienes una meta diaria manual de {ctx.dailyOutreachOverride} contactos en Agencia; el plan calcula {reverse.dailyContacts}. El
          dashboard usa la manual mientras exista.
        </p>
      )}
    </main>
  );
}

function gapStatusLabel(gap: GapResult): string {
  switch (gap.status) {
    case "achieved":
      return "Cumplida";
    case "overdue":
      return "Vencida";
    case "no_target":
      return "Sin Punto B";
    case "no_deadline":
      return "Sin deadline";
    default:
      return gap.onTrack === null ? "Sin ritmo medible" : gap.onTrack ? "En camino" : "Por debajo del ritmo";
  }
}

function MissingData({ items }: { items: string[] }) {
  return (
    <div className="rounded-md bg-warn-bg px-4 py-3 text-sm text-warn mb-3">
      <div className="flex items-center gap-1.5 font-medium mb-1">
        <AlertTriangle size={14} /> Falta información para calcular
      </div>
      <ul className="list-disc pl-5">
        {items.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <p className="mt-1 text-xs">Complétalo en “Editar supuestos” o en la meta. El sistema no inventa estos valores.</p>
    </div>
  );
}

function Stat({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-ink-dim mb-1">{label}</div>
      <div className={`font-semibold text-ink tabular-nums ${strong ? "text-lg" : "text-sm"}`}>{value}</div>
      {hint && <div className="text-[0.68rem] text-ink-dim mt-0.5">{hint}</div>}
    </div>
  );
}
