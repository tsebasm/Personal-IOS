"use client";

import { Pencil } from "lucide-react";
import { createHypothesis, updateHypothesis } from "@/lib/actions/hypotheses";
import { Button } from "@/components/ui/button";
import type { Hypothesis } from "@/lib/agencia/hypotheses";
import { HypothesisFormModal } from "./hypothesis-form";

type Other = Pick<Hypothesis, "id" | "statement">;

export function CreateHypothesisButton({ others }: { others: Other[] }) {
  return (
    <HypothesisFormModal
      action={createHypothesis}
      title="Nueva hipótesis"
      submitLabel="Crear hipótesis"
      others={others}
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          + Nueva hipótesis
        </Button>
      )}
    />
  );
}

export function EditHypothesisButton({ hypothesis, others }: { hypothesis: Hypothesis; others: Other[] }) {
  return (
    <HypothesisFormModal
      action={updateHypothesis}
      title="Editar hipótesis"
      submitLabel="Guardar cambios"
      initial={hypothesis}
      others={others.filter((o) => o.id !== hypothesis.id)}
      trigger={(open) => (
        <button type="button" onClick={open} title="Editar" className="text-ink-dim hover:text-ink">
          <Pencil size={14} />
        </button>
      )}
    />
  );
}
