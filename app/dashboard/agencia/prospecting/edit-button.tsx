"use client";

import { Pencil } from "lucide-react";
import { updateProspectingSession } from "@/lib/actions/prospecting";
import { ProspectingSessionFormModal, type ExperimentOption, type HypothesisOption, type ProspectingSession } from "./session-form";

export function EditProspectingButton({
  session,
  hypotheses,
  experiments,
}: {
  session: ProspectingSession;
  hypotheses: HypothesisOption[];
  experiments: ExperimentOption[];
}) {
  return (
    <ProspectingSessionFormModal
      action={updateProspectingSession}
      title="Editar sesión"
      submitLabel="Guardar cambios"
      initial={session}
      hypotheses={hypotheses}
      experiments={experiments}
      trigger={(open) => (
        <button type="button" onClick={open} title="Editar" className="text-ink-dim hover:text-ink">
          <Pencil size={14} />
        </button>
      )}
    />
  );
}
