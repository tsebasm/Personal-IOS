import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteTransaction } from "@/lib/actions/finances";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { CreateTransactionButton } from "./create-button";
import { EditTransactionButton } from "./edit-button";
import { money } from "@/lib/format";

export default async function FinancesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("id, date, type, category, amount, note")
    .order("date", { ascending: false })
    .limit(50);

  const transactions = data ?? [];
  const ingresos = transactions.filter((t) => t.type === "ingreso").reduce((s, t) => s + Number(t.amount), 0);
  const gastos = transactions.filter((t) => t.type === "gasto").reduce((s, t) => s + Number(t.amount), 0);
  const ahorro = transactions.filter((t) => t.type === "ahorro").reduce((s, t) => s + Number(t.amount), 0);
  const balance = ingresos - gastos;

  return (
    <main className="flex-1 px-6 md:px-8 py-6 max-w-3xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Finanzas</h1>
          <p className="text-sm text-ink-dim mt-1">Ingresos, gastos, balance y ahorro.</p>
        </div>
        <CreateTransactionButton />
      </div>

      {transactions.length === 0 ? (
        <Card className="px-6 py-10">
          <EmptyState
            icon={<Wallet size={20} />}
            title="Aún no tienes movimientos"
            description="Registra tu primer ingreso o gasto para ver tu balance real."
            action={<CreateTransactionButton />}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card className="px-4 py-4">
              <div className="text-xs text-ink-dim mb-1">Ingresos</div>
              <div className="text-lg font-semibold text-good tabular-nums">{money(ingresos)}</div>
            </Card>
            <Card className="px-4 py-4">
              <div className="text-xs text-ink-dim mb-1">Gastos</div>
              <div className="text-lg font-semibold text-bad tabular-nums">{money(gastos)}</div>
            </Card>
            <Card className="px-4 py-4">
              <div className="text-xs text-ink-dim mb-1">Balance</div>
              <div className="text-lg font-semibold text-ink tabular-nums">{money(balance)}</div>
            </Card>
            <Card className="px-4 py-4">
              <div className="text-xs text-ink-dim mb-1">Ahorro</div>
              <div className="text-lg font-semibold text-ink tabular-nums">{money(ahorro)}</div>
            </Card>
          </div>

          <Card>
            <ul className="divide-y divide-border">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="text-sm text-ink truncate">{t.note || t.category || t.type}</div>
                    <div className="text-xs text-ink-dim">{t.date}</div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-none">
                    <Badge tone={t.type === "ingreso" ? "good" : t.type === "gasto" ? "bad" : "neutral"}>
                      {money(Number(t.amount))}
                    </Badge>
                    <EditTransactionButton transaction={{ ...t, amount: Number(t.amount) }} />
                    <DeleteButton action={deleteTransaction.bind(null, t.id)} confirmMessage="¿Eliminar este movimiento?" />
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
