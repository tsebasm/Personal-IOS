import Link from "next/link";

export function LinkButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium bg-ink text-bg hover:opacity-90 text-xs px-2.5 py-1.5 ${className}`}
    >
      {children}
    </Link>
  );
}
