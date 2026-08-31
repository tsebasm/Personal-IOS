import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-ink/20 ${className}`}
        {...props}
      />
    );
  }
);
