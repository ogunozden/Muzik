import type {ReactNode} from "react";
import {tokens} from "@/shared/tokens";

/** Eser Takip yuzeyinde tekrar eden panel kabugu (M8.3 bolme). */
export function Panel({className = "", children}: {className?: string; children: ReactNode}) {
  return (
    <div className={`${tokens.colors.background.surface} ${tokens.colors.border.base} rounded-md border p-4 ${className}`}>
      {children}
    </div>
  );
}

/** Durum/etiket rozeti. */
export function Pill({
  tone = "primary",
  children,
}: {
  tone?: "primary" | "secondary" | "success";
  children: ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "bg-[#388E3C] text-white"
      : tone === "secondary"
        ? "border border-[var(--color-border-base)] text-[var(--color-text-primary)]"
        : "bg-[var(--color-primary-500)] text-white";

  return <span className={`${toneClass} inline-flex rounded-full px-2.5 py-1 text-sm`}>{children}</span>;
}
