import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SerHacerTener } from "@/lib/data/ser-hacer-tener";
import { money, pct } from "@/lib/format";
import { HabitTodayToggle } from "./habit-toggle";
import { CheckinForm } from "./checkin-form";

const h = (min: number) => `${(min / 60).toFixed(1)}h`;

/** SER (identidad/hábitos) → HACER (acciones de la semana) → TENER (resultados). */
export function SerHacerTenerCard({ data, today }: { data: SerHacerTener; today: string }) {
  const { ser, hacer, tener } = data;
  const due = ser.habits.filter((x) => x.compliance.dueToday || x.doneToday);
  const notDue = ser.habits.length - due.length;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="SER" action={<Badge tone="neutral">hábitos · enfoque</Badge>} />
        <div className="px-5 pb-5 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Stat label="Cumplimiento 7 días" value={pct(ser.avgCompliance7d)} />
            <Stat label="Mejor racha" value={ser.bestStreak ? `${ser.bestStreak.value} ${ser.bestStreak.unit}` : "—"} />
          </div>
          {ser.habits.length === 0 ? (
            <p className="text-xs text-ink-dim">Sin hábitos activos.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {due.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-ink truncate">
                    {x.title}
                    {x.compliance.thisWeek && (
                      <span className="text-xs text-ink-dim">
                        {" "}
                        {x.compliance.thisWeek.done}/{x.compliance.thisWeek.target} sem.
                      </span>
                    )}
                  </span>
                  <HabitTodayToggle habitId={x.id} date={today} done={x.doneToday} />
                </li>
              ))}
              {notDue > 0 && <li className="text-xs text-ink-dim">{notDue} hábito(s) no tocan hoy.</li>}
            </ul>
          )}
          <div className="border-t border-border pt-3">
            <CheckinForm date={today} initial={ser.checkin} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="HACER" action={<Badge tone="neutral">esta semana</Badge>} />
        <div className="px-5 pb-5 grid grid-cols-2 gap-3 text-xs">
          <Stat label="Contactos nuevos" value={`${hacer.prospecting.contacts}`} />
          <Stat label="Follow-ups" value={`${hacer.prospecting.followups}`} />
          <Stat label="Respuestas" value={`${hacer.prospecting.replies}`} />
          <Stat label="Citas / asistidas" value={`${hacer.prospecting.appointments} / ${hacer.prospecting.shows}`} />
          <Stat label="Propuestas" value={`${hacer.prospecting.proposals}`} />
          <Stat label="Cierres" value={`${hacer.prospecting.closed}`} />
          <Stat label="Horas de ventas" value={h(hacer.salesMinutes)} />
          <Stat label="Horas de construcción" value={h(hacer.buildMinutes)} />
          <Stat label="Tareas hechas para la meta" value={`${hacer.tasksDoneForNorthStar}`} />
        </div>
      </Card>

      <Card>
        <CardHeader title="TENER" action={<Badge tone="neutral">resultados</Badge>} />
        <div className="px-5 pb-5 grid grid-cols-2 gap-3 text-xs">
          <Stat label="Facturación acumulada" value={money(tener.revenueCumulative)} />
          <Stat label="Clientes activos" value={`${tener.activeClients}`} />
          <Stat label="Progreso meta principal" value={pct(tener.northStarProgressPct)} />
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-ink-dim mb-1">{label}</div>
      <div className="text-sm font-semibold text-ink tabular-nums">{value}</div>
    </div>
  );
}
