"use client";

import { useTransition } from "react";
import { Sun, Moon } from "lucide-react";
import { updateTheme } from "@/lib/actions/theme";

export function ThemeToggle({ theme }: { theme: "system" | "light" | "dark" }) {
  const [pending, startTransition] = useTransition();
  const isDark = theme === "dark";

  function toggle() {
    startTransition(() => {
      updateTheme(isDark ? "light" : "dark");
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="flex items-center gap-2 text-sm text-ink-dim hover:text-ink px-2.5 py-1.5 rounded-md hover:bg-surface-2 disabled:opacity-60"
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {isDark ? <Moon size={15} /> : <Sun size={15} />}
      {isDark ? "Modo oscuro" : "Modo claro"}
    </button>
  );
}
