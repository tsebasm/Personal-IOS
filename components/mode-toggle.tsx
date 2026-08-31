"use client";

import { useTransition } from "react";
import { Lock, LockOpen } from "lucide-react";
import { updateMode } from "@/lib/actions/mode";

export function ModeToggle({ mode }: { mode: "normal" | "config" }) {
  const [pending, startTransition] = useTransition();
  const isConfig = mode === "config";

  function toggle() {
    startTransition(() => {
      updateMode(isConfig ? "normal" : "config");
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-md hover:bg-surface-2 disabled:opacity-60 ${
        isConfig ? "text-warn" : "text-ink-dim hover:text-ink"
      }`}
      title={isConfig ? "Salir del modo configuración" : "Entrar en modo configuración"}
    >
      {isConfig ? <LockOpen size={15} /> : <Lock size={15} />}
      {isConfig ? "Modo configuración" : "Modo normal"}
    </button>
  );
}
