export function ProgressBar({
  value,
  className = "",
}: {
  value: number; // 0-100
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 w-full rounded-full bg-surface-2 ${className}`}>
      <div
        className="h-1.5 rounded-full bg-ink transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
