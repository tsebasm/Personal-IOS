"use client";

import { useActionState, useState } from "react";
import { initialActionState, type ActionState } from "@/lib/actions/types";

/**
 * Shared wiring for every Create<X>Button: open state + a Server Action
 * wrapped so the modal closes itself the moment the action reports success —
 * done inside the action (part of the submit transition), not a useEffect
 * keyed on state, which react-hooks/set-state-in-effect flags.
 */
export function useModalForm(action: (prev: ActionState, formData: FormData) => Promise<ActionState>) {
  const [open, setOpen] = useState(false);

  async function wrapped(prev: ActionState, formData: FormData): Promise<ActionState> {
    const result = await action(prev, formData);
    if (result.ok) setOpen(false);
    return result;
  }

  const [state, formAction, pending] = useActionState(wrapped, initialActionState);

  return { open, setOpen, state, formAction, pending };
}
