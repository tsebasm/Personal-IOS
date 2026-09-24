import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteReview } from "@/lib/actions/reviews";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { CreateReviewButton } from "./create-button";
import { EditReviewButton } from "./edit-button";
import { CloseWeekForm } from "./close-week-form";
import { CardHeader } from "@/components/ui/card";
import { RollupSummary } from "@/components/rollup-summary";
import { loadAnalytics } from "@/lib/data/analytics";

const TYPE_LABEL: Record<string, string> = {
  diaria: "Diaria",
  semanal: "Semanal",
  mensual: "Mensual",
  trimestral: "Trimestral",
};

export default async function ReviewsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, type, period_start, period_end, content")
    .order("period_start", { ascending: false });

  const reviews = data ?? [];
  const analytics = await loadAnalytics();
  const thisWeek = analytics ? reviews.find((r) => r.type === "semanal" && r.period_start === analytics.current.start) : null;
  const thisWeekContent = (thisWeek?.content ?? {}) as { analysis?: string; adjustments?: string };

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Revisiones</h1>
          <p className="text-sm text-ink-dim mt-1">Pausa, revisa y ajusta el rumbo.</p>
        </div>
        <CreateReviewButton />
      </div>

      {analytics && (
        <Card className="mb-6">
          <CardHeader title={`Cierre semanal · ${analytics.current.start} → ${analytics.current.end}`} />
          <div className="px-5 pb-5 flex flex-col gap-5">
            <RollupSummary rollup={analytics.current} />
            <CloseWeekForm
              initialAnalysis={thisWeekContent.analysis ?? ""}
              initialAdjustments={thisWeekContent.adjustments ?? ""}
            />
          </div>
        </Card>
      )}

      <Card>
        {reviews.length === 0 ? (
          <EmptyState
            icon={<RefreshCw size={20} />}
            title="Aún no has hecho una revisión"
            description="Una revisión diaria o semanal te ayuda a mantener el rumbo."
            action={<CreateReviewButton />}
          />
        ) : (
          <ul className="divide-y divide-border">
            {reviews.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="text-sm text-ink">
                    {r.period_start} → {r.period_end}
                  </div>
                  {(r.content as { adjustments?: string } | null)?.adjustments && (
                    <div className="text-xs text-ink-dim truncate">Ajustes: {(r.content as { adjustments: string }).adjustments}</div>
                  )}
                  {(r.content as { progress?: string; energy?: number } | null)?.progress && (
                    <div className="text-xs text-ink-dim">
                      ¿Progreso? {(r.content as { progress: string }).progress} · energía {(r.content as { energy?: number }).energy ?? "—"}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2.5 flex-none">
                  <Badge tone="neutral">{TYPE_LABEL[r.type] ?? r.type}</Badge>
                  <EditReviewButton
                    review={{
                      id: r.id,
                      type: r.type,
                      period_start: r.period_start,
                      period_end: r.period_end,
                      note: (r.content as { note?: string } | null)?.note ?? "",
                    }}
                  />
                  <DeleteButton action={deleteReview.bind(null, r.id)} confirmMessage="¿Eliminar esta revisión?" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
