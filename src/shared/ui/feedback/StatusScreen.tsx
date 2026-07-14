import type {ReactNode} from "react";

export type StatusScreenTone = "loading" | "error" | "empty";

interface StatusScreenProps {
  tone?: StatusScreenTone;
  title: string;
  description?: string;
  action?: ReactNode;
}

const TONE_ACCENT: Record<StatusScreenTone, string> = {
  loading: "var(--color-primary-500)",
  error: "var(--color-error)",
  empty: "var(--color-border-default)",
};

/**
 * Route seviyesinde loading/error/not-found ve panel bos durumlari icin ortak
 * merkezi durum yuzeyi (F5.1/F5.2). Tum yuzeyler ayni yerlesim dilini kullanir.
 */
export function StatusScreen({tone = "loading", title, description, action}: StatusScreenProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"
      style={{backgroundColor: "var(--color-bg-base)"}}
    >
      <span
        aria-hidden="true"
        className={tone === "loading" ? "animate-pulse" : undefined}
        style={{
          display: "inline-block",
          width: 44,
          height: 44,
          borderRadius: 999,
          border: `3px solid ${TONE_ACCENT[tone]}`,
          borderTopColor: tone === "loading" ? "transparent" : TONE_ACCENT[tone],
        }}
      />
      <h1 className="mt-5 text-lg font-semibold" style={{color: "var(--color-text-primary)"}}>
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-md text-sm" style={{color: "var(--color-text-secondary)"}}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
