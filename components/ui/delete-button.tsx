"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

export function DeleteButton({
  action,
  confirmMessage = "¿Eliminar este elemento? Esta acción no se puede deshacer.",
  className = "",
}: {
  action: () => Promise<{ ok: boolean; error?: string }>;
  confirmMessage?: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    startTransition(() => {
      action();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title="Eliminar"
      className={`text-ink-dim hover:text-bad disabled:opacity-50 ${className}`}
    >
      <Trash2 size={14} />
    </button>
  );
}
