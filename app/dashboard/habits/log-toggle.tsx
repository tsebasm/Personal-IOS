/** Casilla de solo lectura: verde si el hábito se cumplió ese día, roja si no. Marcar/desmarcar solo ocurre en "Hoy". */
export function HabitLogDot({ date, done }: { date: string; done: boolean }) {
  return (
    <div
      title={date}
      className={`h-4 w-4 rounded-md flex-none ${done ? "bg-good" : "bg-bad"}`}
    />
  );
}
