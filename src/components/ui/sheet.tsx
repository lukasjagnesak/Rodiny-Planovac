"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Modální panel. Na mobilu vyjíždí zespodu (bottom sheet),
 * na větších obrazovkách je to klasický vystředěný dialog.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade-in bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-surface shadow-[var(--shadow-pop)]",
          "animate-sheet-up sm:animate-pop-in sm:rounded-3xl",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        {/* Úchyt pro tažení na mobilu */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" />

        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavřít"
            className="-mr-1 -mt-1 rounded-full p-2 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>

        {footer ? (
          <div className="safe-bottom flex shrink-0 gap-2 border-t border-line bg-surface-2 px-5 py-3">
            {footer}
          </div>
        ) : (
          <div className="safe-bottom" />
        )}
      </div>
    </div>
  );
}

/** Potvrzovací dialog pro nevratné akce. */
export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Smazat",
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-sm text-ink-muted">{message}</p>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-11 flex-1 rounded-xl border border-line-strong bg-surface text-sm font-medium"
        >
          Zpět
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="h-11 flex-1 rounded-xl bg-danger text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? "Mažu…" : confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
