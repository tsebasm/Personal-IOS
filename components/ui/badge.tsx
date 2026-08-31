type Tone = "neutral" | "good" | "warn" | "bad" | "ink";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-dim",
  good: "bg-good-bg text-good",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  ink: "bg-ink text-bg",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.68rem] font-medium leading-none ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
