import Link from "next/link";
import { Sun, Calendar, Target, Clock, AlertTriangle, CheckCircle2, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { friendlyDate, shiftIsoDate, startOfDayInTimezone } from "@/lib/date";
import { loadTodayContext } from "@/lib/data/today";
import { actionableMinutes } from "@/lib/engine/capacity";
import type { ScoredAction } from "@/lib/engine/priority";
import { money, pct } from "@/lib/format";
import { EXECUTION_MODE_LABEL, TASK_LEVER_LABEL, type TaskLever } from "@/lib/tasks";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { loadSerHacerTener } from "@/lib/data/ser-hacer-tener";
import { SerHacerTenerCard } from "./ser-hacer-tener";
import { ResolveMissedButton, TaskDoneToggle } from "./task-controls";
import { QuickTimeLog } from "@/components/quick-time-log";

const hours = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60 ? `${min % 60}m` : ""}`.trim() : `${min}m`);

/**
 * Command Center: responde "¿qué hago hoy para acercarme a la meta?".
 * Máximo 3 prioridades, cada una con el porqué; el resto queda secundario.
 */
export default async function TodayPage() {
  const ctx = await loadTodayContext();
  if (!ctx) return null;
  const supabase = await createClient();
  const { today, timezone, planCtx, capacity, ranking, missed, doneToday, outreachQuota, contactsToday } = ctx;

  const [sht, { data: eventsData }] = await Promise.all([
    loadSerHacerTener(),
    supabase
      .from("calendar_events")
      .select("id, title, starts_at")
      .gte("starts_at", startOfDayInTimezone(today, timezone))
      .lt("starts_at", startOfDayInTimezone(shiftIsoDate(today, 1), timezone))
      .order("starts_at"),
  ]);
  const events = eventsData ?? [];

  const plan = planCtx?.plan ?? null;
  const isMoney = (plan?.goal.unit ?? "").toUpperCase() === "COP";
  const fmt = (n: number | null) =>
    n === null ? "—" : isMoney ? money(n) : `${Math.round(n).toLocaleString("es-CO")} ${plan?.goal.unit ?? ""}`;
  const usable = actionableMinutes(capacity);

  return (
    <main className="flex-1 px-4 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Hoy</h1>
        <p className="text-sm text-ink-dim mt-1 capitalize">{friendlyDate(timezone)}</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* NORTH STAR ------------------------------------------------------ */}
        <Card>
          <CardHeader title="Meta principal" icon={<Target size={16} className="text-ink-dim" />} />
          <div className="px-5 pb-5">
            {!plan ? (
              <p className="text-sm text-ink-dim">
                No hay meta principal. <Link href="/dashboard/goals" className="underline underline-offset-2">Marca una North Star</Link>{" "}
                para que el sistema priorice contra ella.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-medium text-ink truncate">{plan.goal.title}</span>
                  <span className="text-sm font-semibold text-ink tabular-nums">{pct(plan.gap.progressPct)}</span>
                </div>
                <ProgressBar value={plan.gap.progressPct ?? 0} className="mb-3" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <Stat label="Falta" value={fmt(plan.gap.remaining)} />
                  <Stat label="Días restantes" value={plan.gap.daysLeft === null ? "—" : `${plan.gap.daysLeft}`} />
                  <Stat
                    label="Contactos hoy"
                    value={outreachQuota ? `${contactsToday} / ${outreachQuota.target}` : `${contactsToday}`}
                    hint={outreachQuota ? (outreachQuota.source === "calculated" ? "cuota del plan" : "cuota manual") : "sin cuota: completa el plan"}
                  />
                  <Stat
                    label="Cierres necesarios"
                    value={plan.closes.kind === "revenue" || plan.closes.kind === "clients" ? `${plan.closes.closesNeeded}` : "—"}
                  />
                </div>
                <Link href="/dashboard/plan" className="inline-block mt-3 text-xs font-medium text-ink-dim hover:text-ink">
                  Ver el plan →
                </Link>
              </>
            )}
          </div>
        </Card>

        {/* CAPACIDAD ------------------------------------------------------- */}
        <Card>
          <CardHeader
            title="Tiempo disponible hoy"
            icon={<Clock size={16} className="text-ink-dim" />}
            action={
              <Link href="/dashboard/capacity" className="text-xs text-ink-dim hover:text-ink">
                Editar
              </Link>
            }
          />
          <div className="px-5 pb-5">
            {!capacity.configured ? (
              <p className="text-sm text-ink-dim">
                Sin bloques de capacidad para hoy: el Top 3 no se ajusta a tu tiempo real.{" "}
                <Link href="/dashboard/capacity" className="underline underline-offset-2">
                  Define tu semana tipo
                </Link>
                .
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <Stat label="Profundo" value={hours(capacity.minutes.deep)} hint={`asignado ${hours(ranking.allocated.deep)}`} />
                <Stat label="Ligero" value={hours(capacity.minutes.shallow)} hint={`asignado ${hours(ranking.allocated.shallow)}`} />
                <Stat label="Pasivo (transporte)" value={hours(capacity.minutes.passive)} hint={`asignado ${hours(ranking.allocated.passive)}`} />
                <Stat label="Total utilizable" value={hours(usable)} hint={capacity.unplanned > 0 ? `${hours(capacity.unplanned)} sin planear` : undefined} />
              </div>
            )}
          </div>
        </Card>

        {/* MODO ADAPTATIVO ------------------------------------------------- */}
        {missed.length > 0 && (
          <Card>
            <CardHeader
              title="Pendientes de días anteriores"
              icon={<AlertTriangle size={16} className="text-warn" />}
              action={<Badge tone="warn">{missed.length}</Badge>}
            />
            <p className="px-5 -mt-1 mb-2 text-xs text-ink-dim">
              No se mueven solas: decide por qué no se hicieron y qué hacer. El motivo queda registrado para aprender.
            </p>
            <ul className="px-5 pb-4 flex flex-col gap-2">
              {missed.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 border-t border-border pt-2 first:border-t-0">
                  <div className="min-w-0">
                    <div className="text-sm text-ink truncate">{t.title}</div>
                    <div className="text-xs text-ink-dim">Programada para {t.scheduled_date}</div>
                  </div>
                  <ResolveMissedButton taskId={t.id} title={t.title} today={today} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* TOP 3 ----------------------------------------------------------- */}
        <Card>
          <CardHeader title="Las 3 prioridades de hoy" icon={<Sun size={16} className="text-ink-dim" />} />
          {ranking.top.length === 0 ? (
            <EmptyState
              title="Nada que priorizar todavía"
              description="Crea tareas ligadas a tu meta o completa el plan para que el sistema calcule la cuota de prospección."
              action={<LinkButton href="/dashboard/tasks">+ Nueva tarea</LinkButton>}
            />
          ) : (
            <ol className="px-5 pb-5 flex flex-col gap-3">
              {ranking.top.map((s, i) => (
                <PriorityItem key={s.item.id} rank={i + 1} scored={s} />
              ))}
            </ol>
          )}
        </Card>

        {(ranking.secondary.length > 0 || ranking.excluded.length > 0) && (
          <Card>
            <details className="px-5 py-4">
              <summary className="cursor-pointer select-none text-sm font-medium text-ink">
                Secundarias ({ranking.secondary.length + ranking.excluded.length})
              </summary>
              <ul className="mt-3 flex flex-col gap-2">
                {[...ranking.secondary, ...ranking.excluded].map((s) => (
                  <li key={s.item.id} className="flex items-start gap-2.5 text-sm">
                    {s.item.kind === "task" ? <TaskDoneToggle taskId={s.item.id} done={false} /> : <span className="w-4" />}
                    <div className="min-w-0">
                      <div className="text-ink">{s.item.title}</div>
                      <div className="text-xs text-ink-dim">
                        score {s.score}
                        {s.note ? ` · ${s.note}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          </Card>
        )}

        {doneToday.length > 0 && (
          <Card>
            <CardHeader
              title="Completadas hoy"
              icon={<CheckCircle2 size={16} className="text-good" />}
              action={<Badge tone="good">{doneToday.length}</Badge>}
            />
            <ul className="px-5 pb-4 flex flex-col gap-1.5">
              {doneToday.map((t) => (
                <li key={t.id} className="flex items-start gap-2.5 text-sm text-ink-dim line-through">
                  <TaskDoneToggle taskId={t.id} done />
                  {t.title}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <CardHeader
            title="Registrar tiempo"
            icon={<Timer size={16} className="text-ink-dim" />}
            action={
              <Link href="/dashboard/time" className="text-xs text-ink-dim hover:text-ink">
                Ver semana
              </Link>
            }
          />
          <div className="px-5 pb-5">
            <QuickTimeLog today={today} />
          </div>
        </Card>

        {/* SER → HACER → TENER --------------------------------------------- */}
        {sht && <SerHacerTenerCard data={sht} today={today} />}

        <Card>
          <CardHeader title="Agenda" icon={<Calendar size={16} className="text-ink-dim" />} />
          {events.length === 0 && !capacity.configured ? (
            <EmptyState title="Sin eventos programados" />
          ) : (
            <ul className="px-5 pb-4 flex flex-col gap-1">
              {capacity.blocks.map((b) => (
                <li key={`b-${b.id}`} className="flex items-center justify-between gap-2 py-1 text-xs text-ink-dim">
                  <span>{b.label}</span>
                  <span className="font-mono">
                    {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                  </span>
                </li>
              ))}
              {events.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-2 py-1.5 border-t border-border">
                  <span className="text-sm text-ink">{ev.title}</span>
                  <Badge tone="neutral" className="font-mono">
                    {new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(
                      new Date(ev.starts_at)
                    )}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}

function PriorityItem({ rank, scored }: { rank: number; scored: ScoredAction }) {
  const { item } = scored;
  const lever = item.lever ? (TASK_LEVER_LABEL[item.lever as TaskLever] ?? item.lever) : null;
  const mode = item.execution_mode ? EXECUTION_MODE_LABEL[item.execution_mode as keyof typeof EXECUTION_MODE_LABEL] : null;
  return (
    <li className="flex items-start gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-ink text-bg text-xs font-semibold">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-ink">{item.title}</span>
          {item.kind === "task" ? (
            <TaskDoneToggle taskId={item.id} done={false} />
          ) : (
            <Link
              href={item.id === "plan:followups" ? "/dashboard/agencia/leads" : "/dashboard/agencia/prospecting"}
              className="text-xs font-medium text-ink-dim hover:text-ink whitespace-nowrap"
            >
              Registrar →
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {lever && <Badge tone="neutral">{lever}</Badge>}
          {mode && <Badge tone="neutral">{mode.split(" (")[0]}</Badge>}
          {item.estimated_minutes !== null && <Badge tone="neutral">{hours(item.estimated_minutes)}</Badge>}
        </div>
        <p className="text-xs text-ink-dim mt-1">Por qué: {scored.reasons.join(" · ")}</p>
      </div>
    </li>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-ink-dim mb-1">{label}</div>
      <div className="text-sm font-semibold text-ink tabular-nums">{value}</div>
      {hint && <div className="text-[0.68rem] text-ink-dim mt-0.5">{hint}</div>}
    </div>
  );
}
