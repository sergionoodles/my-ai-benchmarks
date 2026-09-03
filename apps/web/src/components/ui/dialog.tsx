import * as React from "react";
import { cn } from "../../lib/utils";

// Minimal shadcn-style modal/drawer (no extra deps for v1).
export function Dialog({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          "relative ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden bg-card shadow-xl",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
