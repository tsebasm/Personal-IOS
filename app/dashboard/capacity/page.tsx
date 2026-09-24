import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { deleteCapacityBlock } from "@/lib/actions/capacity";
import { isoDateInTimezone, shiftIsoDate } from "@/lib/date";
import {
  CAPACITY_KIND_LABEL,
  blockMinutes,
  computeDayCapacity,
  weekdayOf,
  type CapacityBlock,
} from "@/lib/engine/capacity";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { CreateBlockButton, EditBlockButton, WEEKDAYS } from "./block-form";

const h = (min: number) => (min === 0 ? "—" : `${(min / 60).toFixed(1)}h`);

export default async function CapacityPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const today = isoDateInTimezone(profile?.timezone ?? "America/Bogota");

  const { data } = await supabase
    .from("capacity_blocks")
    .select("id, label, kind, days_of_week, start_time, end_time, valid_from, valid_to")
    .order("start_time", { ascending: true });
  const blocks = (data ?? []) as CapacityBlock[];

  // Próximos 7 días (incluye excepciones con vigencia).
  const week = Array.from({ length: 7 }, (_, i) => computeDayCapacity(blocks, shiftIsoDate(today, i)));
  const totals = week.reduce(
    (acc, d) => ({
      deep: acc.deep + d.minutes.deep,
      shallow: acc.shallow + d.minutes.shallow,
      passive: acc.passive + d.minutes.passive,
      recovery: acc.recovery + d.minutes.recovery,
    }),
    { deep: 0, shallow: 0, passive: 0, recovery: 0 }
  );

  return (
    <main className="flex-1 px-4 md:px-8 py-6 max-w-4xl w-full mx-auto">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Capacidad</h1>
          <p className="text-sm text-ink-dim mt-1">
            Tu semana tipo. El transporte cuenta como tiempo pasivo (celular), nunca como trabajo profundo.
          </p>
        </div>
        <CreateBlockButton />
      </div>

      {blocks.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Clock size={20} />}
            title="Sin bloques definidos"
            description="Agrega sueño, universidad, transporte y tus bloques de trabajo profundo/ligero. El Top 3 de Hoy se ajusta a esta capacidad."
            action={<CreateBlockButton />}
          />
        </Card>
      ) : (
        <>
          <Card className="mb-6 overflow-x-auto">
            <CardHeader title="Próximos 7 días" />
            <table className="w-full text-xs mb-4">
              <thead>
                <tr className="text-ink-dim">
                  <th className="text-left font-normal px-5 py-1">Día</th>
                  <th className="text-right font-normal px-2 py-1">Profundo</th>
                  <th className="text-right font-normal px-2 py-1">Ligero</th>
                  <th className="text-right font-normal px-2 py-1">Pasivo</th>
                  <th className="text-right font-normal px-2 py-1">Descanso</th>
                  <th className="text-right font-normal px-5 py-1">Sin planear</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {week.map((d) => (
                  <tr key={d.date} className="border-t border-border text-ink">
                    <td className="px-5 py-1.5">
                      {WEEKDAYS[weekdayOf(d.date)]} {d.date.slice(5)}
                    </td>
                    <td className="text-right px-2">{h(d.minutes.deep)}</td>
                    <td className="text-right px-2">{h(d.minutes.shallow)}</td>
                    <td className="text-right px-2">{h(d.minutes.passive)}</td>
                    <td className="text-right px-2">{h(d.minutes.recovery)}</td>
                    <td className="text-right px-5 text-ink-dim">{h(d.unplanned)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border font-semibold text-ink">
                  <td className="px-5 py-1.5">Semana</td>
                  <td className="text-right px-2">{h(totals.deep)}</td>
                  <td className="text-right px-2">{h(totals.shallow)}</td>
                  <td className="text-right px-2">{h(totals.passive)}</td>
                  <td className="text-right px-2">{h(totals.recovery)}</td>
                  <td className="px-5" />
                </tr>
              </tbody>
            </table>
          </Card>

          <Card>
            <CardHeader title="Bloques" />
            <ul className="divide-y divide-border">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-ink truncate">{b.label}</div>
                    <div className="text-xs text-ink-dim">
                      {b.days_of_week
                        .slice()
                        .sort()
                        .map((d) => WEEKDAYS[d])
                        .join(" ")}{" "}
                      · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)} ({h(blockMinutes(b.start_time, b.end_time))})
                      {b.valid_from || b.valid_to ? ` · vigente ${b.valid_from ?? "…"} a ${b.valid_to ?? "…"}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-none">
                    <Badge tone="neutral">{CAPACITY_KIND_LABEL[b.kind]}</Badge>
                    <EditBlockButton block={b} />
                    <DeleteButton action={deleteCapacityBlock.bind(null, b.id)} confirmMessage={`¿Eliminar el bloque "${b.label}"?`} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </main>
  );
}
