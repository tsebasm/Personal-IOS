"use client";

import { Pencil } from "lucide-react";
import { updateProspectingSession } from "@/lib/actions/prospecting";
import { ProspectingSessionFormModal, type HypothesisOption, type ProspectingSession } from "./session-form";

export function EditProspectingButton({
  session,
  hypotheses,
}: {
  session: ProspectingSession;
  hypotheses: HypothesisOption[];
}) {
  return (
    <ProspectingSessionFormModal
      action={updateProspectingSession}
      title="Editar sesión"
      submitLabel="Guardar cambios"
      initial={session}
      hypotheses={hypotheses}
      trigger={(open) => (
        <button type="button" onClick={open} title="Editar" className="text-ink-dim hover:text-ink">
          <Pencil size={14} />
        </button>
      )}
    />
  );
}
