"use client";

import { useTransition } from "react";
import { toggleHabitLog } from "@/lib/actions/habits";

/** Único lugar donde un hábito puede marcarse/desmarcarse como cumplido. */
export function HabitTodayToggle({ habitId, date, done }: { habitId: string; date: string; done: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title={done ? "Marcar como no realizado" : "Marcar como realizado"}
      aria-pressed={done}
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          toggleHabitLog(habitId, date);
        })
      }
      className={`h-4 w-4 rounded-full flex-none transition-colors disabled:opacity-50 ${
        done ? "bg-good" : "bg-surface-2 border border-border hover:border-ink-dim"
      }`}
    />
  );
}
