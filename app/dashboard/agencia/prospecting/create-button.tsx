"use client";

import { createProspectingSession } from "@/lib/actions/prospecting";
import { Button } from "@/components/ui/button";
import { ProspectingSessionFormModal, type ExperimentOption, type HypothesisOption } from "./session-form";

export function CreateProspectingButton({ hypotheses, experiments }: { hypotheses: HypothesisOption[]; experiments: ExperimentOption[] }) {
  return (
    <ProspectingSessionFormModal
      action={createProspectingSession}
      title="Nueva sesión de prospección"
      submitLabel="Guardar sesión"
      hypotheses={hypotheses}
      experiments={experiments}
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          + Nueva sesión
        </Button>
      )}
    />
  );
}
