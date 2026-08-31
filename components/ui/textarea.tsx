import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={3}
        className={`rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-ink/20 resize-none ${className}`}
        {...props}
      />
    );
  }
);
