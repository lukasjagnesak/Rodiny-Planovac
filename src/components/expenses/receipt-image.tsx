"use client";

import * as React from "react";
import { FileText, ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * Účtenky leží v privátním bucketu — k zobrazení je potřeba podepsaná URL.
 * Ta platí hodinu a generuje se až ve chvíli, kdy je náhled na obrazovce.
 */
export function ReceiptImage({
  path,
  mimeType,
  className,
  onClick,
}: {
  path: string;
  mimeType?: string | null;
  className?: string;
  onClick?: () => void;
}) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.storage
      .from("receipts")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) setFailed(true);
        else setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);

  const isPdf = mimeType === "application/pdf";

  if (isPdf) {
    return (
      <a
        href={url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center justify-center bg-surface-2 text-ink-muted ${className ?? ""}`}
      >
        <FileText className="h-6 w-6" />
      </a>
    );
  }

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-surface-2 text-ink-subtle ${className ?? ""}`}>
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }

  if (!url) {
    return <div className={`skeleton ${className ?? ""}`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Účtenka"
      onClick={onClick}
      className={`object-cover ${onClick ? "cursor-zoom-in" : ""} ${className ?? ""}`}
    />
  );
}

/** Zvětšený náhled účtenky přes celou obrazovku. */
export function ReceiptLightbox({
  path,
  mimeType,
  onClose,
}: {
  path: string;
  mimeType?: string | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <ReceiptImage
        path={path}
        mimeType={mimeType}
        className="max-h-full max-w-full rounded-xl !object-contain"
      />
    </div>
  );
}
