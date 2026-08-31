export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** A trigger to render below the copy — typically a Create<X>Button client component. */
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-10 gap-3">
      {icon && <div className="text-ink-dim">{icon}</div>}
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="text-xs text-ink-dim mt-1 max-w-xs">{description}</p>}
      </div>
      {action}
    </div>
  );
}
