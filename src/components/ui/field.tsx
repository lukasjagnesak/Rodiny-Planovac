import * as React from "react";
import { cn } from "@/lib/format";

const CONTROL =
  "w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-ink " +
  "placeholder:text-ink-subtle transition-colors " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 " +
  "disabled:opacity-60 disabled:bg-surface-2";

export function Label({
  children,
  hint,
  required,
  className,
  htmlFor,
}: {
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-sm font-medium text-ink", className)}>
      {children}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
      {hint ? <span className="ml-2 font-normal text-ink-subtle">{hint}</span> : null}
    </label>
  );
}

export function Field({
  label,
  hint,
  required,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label hint={hint} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(CONTROL, "resize-y", className)} {...props} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(CONTROL, "appearance-none pr-9 bg-no-repeat", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236f6b66' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 0.7rem center",
      }}
      {...props}
    >
      {children}
    </select>
  );
});

export function Checkbox({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-line-strong accent-[var(--brand)]"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? <span className="block text-xs text-ink-muted">{description}</span> : null}
      </span>
    </label>
  );
}
