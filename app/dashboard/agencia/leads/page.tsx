import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import { deleteLead } from "@/lib/actions/leads";
import { isoDateInTimezone } from "@/lib/date";
import { LEAD_COLUMNS, LEAD_STAGES, LEAD_STAGE_LABEL, OPEN_STAGES, followupsDue, type Lead } from "@/lib/agencia/leads";
import { money } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { AgenciaTabs } from "../tabs";
import { CreateLeadButton, EditLeadButton, FollowupDoneButton } from "./lead-form";

const STAGE_TONE: Record<string, "good" | "bad" | "warn" | "neutral"> = { won: "good", lost: "bad", proposal: "warn", showed: "warn" };

export default async function LeadsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const today = isoDateInTimezone(profile?.timezone ?? "America/Bogota");

  const [{ data: leadsData }, { data: hypothesesData }] = await Promise.all([
    supabase.from("leads").select(LEAD_COLUMNS).order("updated_at", { ascending: false }),
    supabase.from("hypotheses").select("id, statement").neq("status", "rejected").order("created_at", { ascending: false }),
  ]);
  const leads = (leadsData ?? []) as Lead[];
  const hypotheses = hypothesesData ?? [];
  const due = followupsDue(leads, today);
  const counts = Object.fromEntries(LEAD_STAGES.map((s) => [s, leads.filter((l) => l.stage === s).length]));
  const openValue = leads.filter((l) => OPEN_STAGES.includes(l.stage)).reduce((s, l) => s + (Number(l.est_value) || 0), 0);

  return (
    <main className="flex-1 px-4 md:px-8 py-6 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Agencia</h1>
          <p className="text-sm text-ink-dim mt-1">Pipeline por oportunidad: alimenta el plan y detecta follow-ups vencidos.</p>
        </div>
        <CreateLeadButton hypotheses={hypotheses} />
      </div>

      <AgenciaTabs />

      {leads.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Users size={20} />}
            title="Sin leads todavía"
            description="Registra cada prospecto que responde (o antes). Mientras no haya leads, el plan usa la foto manual del pipeline."
            action={<CreateLeadButton hypotheses={hypotheses} />}
          />
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-3 px-5 py-4 text-xs">
              {LEAD_STAGES.map((s) => (
                <div key={s}>
                  <div className="text-ink-dim mb-1">{LEAD_STAGE_LABEL[s]}</div>
                  <div className="text-sm font-semibold text-ink tabular-nums">{counts[s]}</div>
                </div>
              ))}
            </div>
            {openValue > 0 && <p className="px-5 pb-4 text-xs text-ink-dim">Valor estimado abierto: {money(openValue)}</p>}
          </Card>

          {due.length > 0 && (
            <Card className="mb-4">
              <CardHeader title="Follow-ups para hoy o vencidos" action={<Badge tone="warn">{due.length}</Badge>} />
              <ul className="px-5 pb-4 flex flex-col gap-2">
                {due.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 first:border-t-0">
                    <div className="min-w-0 text-sm text-ink">
                      {l.name}
                      <span className="text-xs text-ink-dim">
                        {" "}
                        · {LEAD_STAGE_LABEL[l.stage]} · tocaba el {l.next_followup_on} · {l.followups_done} hechos
                      </span>
                    </div>
                    <FollowupDoneButton leadId={l.id} today={today} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <ul className="divide-y divide-border">
              {leads.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-ink truncate">
                      {l.name}
                      {l.company ? <span className="text-ink-dim"> · {l.company}</span> : null}
                    </div>
                    <div className="text-xs text-ink-dim">
                      {l.channel ?? "sin canal"} · {l.followups_done} follow-ups
                      {l.next_followup_on ? ` · próximo ${l.next_followup_on}` : ""}
                      {l.est_value ? ` · ${money(Number(l.est_value))}` : ""}
                      {l.lost_reason ? ` · perdido: ${l.lost_reason}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-none">
                    <Badge tone={STAGE_TONE[l.stage] ?? "neutral"}>{LEAD_STAGE_LABEL[l.stage]}</Badge>
                    <EditLeadButton lead={l} hypotheses={hypotheses} />
                    <DeleteButton action={deleteLead.bind(null, l.id)} confirmMessage={`¿Eliminar el lead "${l.name}"?`} />
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
