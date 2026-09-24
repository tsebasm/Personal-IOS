"use client";

import { createProspectingSession } from "@/lib/actions/prospecting";
import { Button } from "@/components/ui/button";
import { ProspectingSessionFormModal, type HypothesisOption } from "./session-form";

export function CreateProspectingButton({ hypotheses }: { hypotheses: HypothesisOption[] }) {
  return (
    <ProspectingSessionFormModal
      action={createProspectingSession}
      title="Nueva sesión de prospección"
      submitLabel="Guardar sesión"
      hypotheses={hypotheses}
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          + Nueva sesión
        </Button>
      )}
    />
  );
}
