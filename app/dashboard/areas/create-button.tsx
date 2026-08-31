"use client";

import { useState } from "react";
import { createArea } from "@/lib/actions/areas";
import { useModalForm } from "@/components/ui/use-modal-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const SWATCHES = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
];

export function CreateAreaButton() {
  const [color, setColor] = useState(SWATCHES[5]);
  const { open, setOpen, state, formAction, pending } = useModalForm(createArea);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Nueva área
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva área">
        <form action={formAction} className="flex flex-col gap-3">
          <Field label="Nombre" htmlFor="area-name">
            <Input id="area-name" name="name" required maxLength={80} placeholder="Negocios" />
          </Field>

          <Field label="Color" htmlFor="area-color">
            <input type="hidden" name="color" value={color} />
            <div className="flex items-center gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border-2 ${
                    color === c ? "border-ink" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </Field>

          {state.error && <p className="text-xs text-bad">{state.error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creando…" : "Crear área"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
