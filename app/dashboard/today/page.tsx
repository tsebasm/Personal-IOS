import Link from "next/link";
import { Activity, AlertTriangle, Calendar, CheckCircle2, ChevronRight, Clock, Lock, Moon, Sun, Target, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { friendlyDate, shiftIsoDate, startOfDayInTimezone } from "@/lib/date";
import { loadTodayContext } from "@/lib/data/today";
import { loadDayExecution, type DayItem } from "@/lib/data/day";
import { actionableMinutes } from "@/lib/engine/capacity";
import { goalCurrency } from "@/lib/engine/plan";
import { PACE_LABEL, paceGap, paceStatus, type PaceState } from "@/lib/engine/execution";
import { describeConversion, money, moneyIn, pct } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TierControl } from "@/components/tier-control";
import { loadSerHacerTener } from "@/lib/data/ser-hacer-tener";
import { loadAnalytics } from "@/lib/data/analytics";
import { SerHacerTenerCard } from "./ser-hacer-tener";
import { ResolveMissedButton, TaskDoneToggle } from "./task-controls";
import { QuickTimeLog } from "@/components/quick-time-log";
import { CloseDayForm } from "./close-day";

const hours = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60 ? `${min % 60}m` : ""}`.trim() : `${min}m`);

const PACE_TONE: Record<PaceState, "good" | "neutral" | "warn" | "bad"> = {
  very_ahead: "good",
  ahead: "good",
  on_pace: "neutral",
  slightly_behind: "warn",
  behind: "warn",
  critically_behind: "bad",
};

/**
 * HOY v2 (spec §30–§32, §93–§94; B-2): META → HOY → P0 → P1 → resto.
 * Un P0 incompleto da prioridad visual, impacto en el score y advertencia.
 * NUNCA bloquea: todo lo demás sigue accesible (colapsado) y el menú intacto.
 */
export default async function TodayPage() {
  const ctx = await loadTodayContext();
  if (!ctx) return null;
  const supabase = await createClient();
  const { today, timezone, planCtx, capacity, ranking, missed } = ctx;

  const [day, sht, analytics, { data: eventsData }, { data: dayLog }] = await Promise.all([
    loadDayExecution(supabase, today, timezone),
    loadSerHacerTener(),
    loadAnalytics(),
    supabase
      .from("calendar_events")
      .select("id, title, starts_at")
      .gte("starts_at", startOfDayInTimezone(today, timezone))
      .lt("starts_at", startOfDayInTimezone(shiftIsoDate(today, 1), timezone))
      .order("starts_at"),
    // Registro del día (0017/0022); si la tabla falta, simplemente no hay cierre.
    supabase.from("daily_logs").select("closed_at, execution_score").eq("date", today).maybeSingle(),
  ]);
  const events = eventsData ?? [];

  const plan = planCtx?.plan ?? null;
  const isMoney = !!plan && (!!plan.goal.currency || /^[A-Z]{3}$/.test(plan.goal.unit ?? ""));
  const fmt = (n: number | null) =>
    n === null ? "—" : isMoney && plan ? moneyIn(n, goalCurrency(plan.goal)) : `${Math.round(n).toLocaleString("es-CO")} ${plan?.goal.unit ?? ""}`;
  const pace = plan ? paceStatus(plan.gap.requiredPerDay, plan.gap.actualPerDay) : null;
  const usable = actionableMinutes(capacity);

  const { score } = day;
  const byTier = (t: "p0" | "p1" | "p2") => day.items.filter((i) => (i.tier ?? "p2") === t);
  const p0 = byTier("p0");
  const p1 = byTier("p1");
  const p2 = byTier("p2");
  const firstPendingP0 = p0.find((i) => !i.completion.complete) ?? null;

  // Acciones del plan (p. ej. cuota de prospección) si ninguna tarea de hoy ya mide esa métrica.
  const coveredMetrics = new Set(day.items.map((i) => i.metric_key).filter(Boolean));
  const planActions = ranking.top
    .concat(ranking.secondary)
    .filter((s) => s.item.kind === "plan")
    .filter((s) => !(s.item.id === "plan:outreach" && coveredMetrics.has("contacts")));

  return (
    <main className="flex-1 px-4 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-ink">Hoy</h1>
        <p className="text-sm text-ink-dim mt-1 capitalize">{friendlyDate(timezone)}</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* FRICCIÓN VISUAL (B-2): advertencia, nunca bloqueo ------------------------ */}
        {score.p0Pending > 0 && firstPendingP0 && (
          <div className="rounded-lg border border-warn bg-warn-bg px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-warn">
              <AlertTriangle size={16} /> P0 pendiente — {progressText(firstPendingP0)}
            </div>
            <p className="mt-0.5 text-xs text-warn">
              {score.p0Pending === 1 ? "Queda 1 acción crítica" : `Quedan ${score.p0Pending} acciones críticas`}. Hazla antes de lo opcional: lo demás sigue disponible abajo y en el menú.
            </p>
          </div>
        )}
        {score.missionComplete && (
          <div className="rounded-lg border border-good bg-good-bg px-4 py-3 text-sm font-semibold text-good flex items-center gap-2">
            <CheckCircle2 size={16} /> Misión principal completada
          </div>
        )}

        {/* META ----------------------------------------------------------------------- */}
        <Card>
          <CardHeader
            title={plan?.goal.locked_at ? "Meta activa" : "Meta principal"}
            icon={plan?.goal.locked_at ? <Lock size={16} className="text-ink-dim" /> : <Target size={16} className="text-ink-dim" />}
            action={pace && pace.state ? <Badge tone={PACE_TONE[pace.state]}>{PACE_LABEL[pace.state]}</Badge> : undefined}
          />
          <div className="px-5 pb-5">
            {!plan ? (
              <p className="text-sm text-ink-dim">
                No hay meta principal. <Link href="/dashboard/goals" className="underline underline-offset-2">Marca una North Star</Link> para que el sistema priorice contra ella.
              </p>
            ) : (
              <>
                <div className="flex items-end justify-between gap-3 mb-1">
                  <span className="text-base font-semibold text-ink">{plan.goal.title}</span>
                  <span className="text-xs text-ink-dim tabular-nums whitespace-nowrap">{plan.gap.daysLeft === null ? "" : `D-${plan.gap.daysLeft}`}</span>
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <ProgressBar value={plan.gap.progressPct ?? 0} className="flex-1" />
                  <span className="text-sm font-semibold text-ink tabular-nums">{pct(plan.gap.progressPct)}</span>
                </div>
                <p className="text-[0.7rem] text-ink-dim mb-3">
                  {plan.currentValue === null ? "Progreso pendiente de conversión" : `${fmt(plan.currentValue)} de ${fmt(plan.gap.target)}`}
                  {plan.revenueRecorded &&
                    ` · recibido: ${plan.revenueRecorded.length === 0 ? "sin pagos registrados" : plan.revenueRecorded.map((r) => moneyIn(r.amount, r.currency)).join(" + ")}`}
                  {describeConversion(plan.conversion) ? ` · ${describeConversion(plan.conversion)}` : ""}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <Stat label="Falta" value={fmt(plan.gap.remaining)} />
                  <Stat label="Ritmo requerido / día" value={fmt(plan.gap.requiredPerDay)} />
                  <Stat
                    label="Ritmo real / día"
                    value={plan.gap.actualPerDay === null ? "—" : fmt(plan.gap.actualPerDay)}
                    hint={pace && !pace.state && pace.reason === "no_actual" ? "falta fecha de inicio de la meta" : undefined}
                  />
                  <Stat
                    label="Brecha 7 días"
                    value={pace && pace.state ? fmt(paceGap(pace.requiredPerDay, pace.actualPerDay).weekly) : "—"}
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {/* HOY: P0 → P1 → P2 -------------------------------------------------------------- */}
        <Card>
          <CardHeader
            title="Hoy"
            icon={<Sun size={16} className="text-ink-dim" />}
            action={<span className="text-sm font-semibold text-ink tabular-nums">Ejecución {score.score === null ? "—" : `${score.score}%`}</span>}
          />
          <div className="px-5 pb-5 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              {(["p0", "p1", "p2"] as const).map((t) => (
                <div key={t}>
                  <div className="flex justify-between text-[0.68rem] text-ink-dim mb-1">
                    <span className="font-semibold">{t.toUpperCase()}</span>
                    <span className="tabular-nums">
                      {score.byTier[t].done}/{score.byTier[t].planned}
                    </span>
                  </div>
                  <ProgressBar value={score.byTier[t].planned ? (score.byTier[t].done / score.byTier[t].planned) * 100 : 0} />
                </div>
              ))}
            </div>

            <TierSection title="P0 — Crítico" items={p0} emphasis>
              {planActions.map((s) => (
                <li key={s.item.id} className="flex items-center justify-between gap-3 rounded-md border border-ink px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink">{s.item.title}</div>
                    <div className="text-[0.7rem] text-ink-dim">Sugerido por el plan · {s.reasons.slice(0, 2).join(" · ")}</div>
                  </div>
                  <Link
                    href={s.item.id === "plan:followups" ? "/dashboard/agencia/leads" : "/dashboard/agencia/prospecting"}
                    className="flex-none rounded-md bg-ink px-3 py-2 text-xs font-medium text-bg"
                  >
                    Registrar
                  </Link>
                </li>
              ))}
            </TierSection>
            {p0.length === 0 && planActions.length === 0 && (
              <p className="text-xs text-ink-dim">
                Sin P0 para hoy. Los P0 vienen de tus rutinas, de un plan aprobado o de tus{" "}
                <Link href="/dashboard/configuracion" className="underline underline-offset-2">reglas de prioridad</Link>.
              </p>
            )}
            <TierSection title="P1 — Capacidad" items={p1} />
            {p2.length > 0 && (
              <details>
                <summary className="cursor-pointer select-none text-xs font-semibold text-ink-dim">P2 — Secundario ({p2.length})</summary>
                <ul className="mt-2 flex flex-col gap-2">
                  {p2.map((i) => (
                    <ItemRow key={i.id} item={i} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        </Card>

        {/* CERRAR EL DÍA (§35): snapshot inmutable ---------------------------------------------- */}
        <Card>
          <CardHeader title="Cierre del día" icon={<Moon size={16} className="text-ink-dim" />} />
          <div className="px-5 pb-5">
            {dayLog?.closed_at ? (
              <p className="text-sm text-ink-dim">
                Día cerrado a las{" "}
                {new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(new Date(dayLog.closed_at))} ·
                ejecución {dayLog.execution_score === null ? "—" : `${Number(dayLog.execution_score)}%`}. Queda en Revisiones.
              </p>
            ) : (
              <details>
                <summary className="cursor-pointer select-none text-xs font-medium text-ink">Cerrar el día</summary>
                <div className="mt-3">
                  <CloseDayForm defaults={{ energy: sht?.ser.checkin?.energy ?? null, focus: sht?.ser.checkin?.focus ?? null }} />
                </div>
              </details>
            )}
          </div>
        </Card>

        {/* PENDIENTES DE DÍAS ANTERIORES (modo adaptativo) ------------------------------------- */}
        {missed.length > 0 && (
          <Card>
            <CardHeader title="Pendientes de días anteriores" icon={<AlertTriangle size={16} className="text-warn" />} action={<Badge tone="warn">{missed.length}</Badge>} />
            <p className="px-5 -mt-1 mb-2 text-xs text-ink-dim">Vencida no significa no hecha: decide qué pasó y qué hacer. El motivo queda registrado.</p>
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

        {/* MÁS DEL DÍA: colapsado mientras haya P0 pendiente (fricción, no bloqueo) ----------- */}
        <details open={score.p0Pending === 0} className="group">
          <summary className="flex cursor-pointer select-none items-center gap-1 text-sm font-medium text-ink-dim hover:text-ink">
            <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
            Más del día {score.p0Pending > 0 && "(disponible; primero tu P0)"}
          </summary>
          <div className="mt-4 flex flex-col gap-4">
            {analytics && analytics.dayDiff.length > 0 && (
              <Card>
                <CardHeader title="¿Qué cambió desde ayer?" icon={<Activity size={16} className="text-ink-dim" />} />
                <ul className="px-5 pb-4 flex flex-col gap-1">
                  {analytics.dayDiff.map((d) => (
                    <li key={d.key} className="flex justify-between gap-3 text-xs">
                      <span className="text-ink">{d.label}</span>
                      <span className="tabular-nums text-ink-dim">
                        ayer {d.key === "revenue" ? money(d.yesterday) : d.yesterday} → hoy{" "}
                        <span className={d.delta > 0 ? "text-good" : "text-warn"}>{d.key === "revenue" ? money(d.today) : d.today}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {ranking.top.filter((s) => s.item.kind === "task").length > 0 && (
              <Card>
                <CardHeader title="Siguientes sugeridas (fuera de hoy)" />
                <ul className="px-5 pb-4 flex flex-col gap-2">
                  {ranking.top
                    .filter((s) => s.item.kind === "task" && !day.items.some((i) => i.id === s.item.id))
                    .map((s) => (
                      <li key={s.item.id} className="flex items-start gap-2.5 text-sm">
                        <TaskDoneToggle taskId={s.item.id} done={false} />
                        <div className="min-w-0">
                          <div className="text-ink">{s.item.title}</div>
                          <div className="text-xs text-ink-dim">{s.reasons.join(" · ")}</div>
                        </div>
                      </li>
                    ))}
                </ul>
              </Card>
            )}

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
                    Sin bloques de capacidad para hoy. <Link href="/dashboard/capacity" className="underline underline-offset-2">Define tu semana tipo</Link>.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <Stat label="Profundo" value={hours(capacity.minutes.deep)} />
                    <Stat label="Ligero" value={hours(capacity.minutes.shallow)} />
                    <Stat label="Pasivo" value={hours(capacity.minutes.passive)} />
                    <Stat label="Total utilizable" value={hours(usable)} />
                  </div>
                )}
              </div>
            </Card>

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

            {sht && <SerHacerTenerCard data={sht} today={today} />}

            <Card>
              <CardHeader title="Agenda" icon={<Calendar size={16} className="text-ink-dim" />} />
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
                      {new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(new Date(ev.starts_at))}
                    </Badge>
                  </li>
                ))}
                {capacity.blocks.length === 0 && events.length === 0 && <li className="text-xs text-ink-dim">Sin eventos programados.</li>}
              </ul>
            </Card>
          </div>
        </details>
      </div>
    </main>
  );
}

function progressText(i: DayItem): string {
  if (i.target_qty !== null) {
    const actual = i.completion.actual;
    return `${actual === null ? 0 : Math.round(actual).toLocaleString("es-CO")}/${i.target_qty.toLocaleString("es-CO")} ${i.unit ?? ""}`.trim();
  }
  return i.title;
}

function TierSection({ title, items, emphasis, children }: { title: string; items: DayItem[]; emphasis?: boolean; children?: React.ReactNode }) {
  if (items.length === 0 && !children) return null;
  return (
    <section>
      <h3 className={`mb-2 text-xs font-semibold ${emphasis ? "text-ink" : "text-ink-dim"}`}>{title}</h3>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <ItemRow key={i.id} item={i} emphasis={emphasis} />
        ))}
        {children}
      </ul>
    </section>
  );
}

function ItemRow({ item, emphasis }: { item: DayItem; emphasis?: boolean }) {
  const done = item.completion.complete;
  const quantified = item.target_qty !== null;
  return (
    <li className={`rounded-md border px-3 py-2.5 ${emphasis && !done ? "border-ink" : "border-border"} ${done ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <TierControl taskId={item.id} info={item.tierInfo} />
          <span className={`text-sm ${done ? "line-through text-ink-dim" : emphasis ? "font-medium text-ink" : "text-ink"}`}>{item.title}</span>
        </div>
        {quantified && item.metric_key && item.recordHref ? (
          <Link href={item.recordHref} className="flex-none rounded-md bg-ink px-3 py-2 text-xs font-medium text-bg">
            Registrar
          </Link>
        ) : (
          <TaskDoneToggle taskId={item.id} done={item.done} />
        )}
      </div>
      {quantified && (
        <div className="mt-2 flex items-center gap-2">
          <ProgressBar value={(item.completion.progress ?? 0) * 100} className="flex-1" />
          <span className="text-xs tabular-nums text-ink-dim whitespace-nowrap">
            {progressText(item)}
            {item.metric_key && item.completion.actual === null ? " · sin datos aún" : ""}
          </span>
        </div>
      )}
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
