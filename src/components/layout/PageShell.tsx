import type {ReactNode} from "react";
import {tokens} from "@/shared/tokens";

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

interface SurfaceProps {
  children: ReactNode;
  className?: string;
}

export function PageShell({children, className = ""}: PageShellProps) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({title, description, meta, actions, className = ""}: PageHeaderProps) {
  return (
    <section className={`mb-8 flex flex-col gap-4 border-b border-[var(--color-border-subtle)] pb-6 lg:flex-row lg:items-end lg:justify-between ${className}`}>
      <div className="min-w-0">
        {meta && (
          <div className={`mb-2 text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>
            {meta}
          </div>
        )}
        <h1 className="text-3xl font-bold leading-tight text-[var(--color-text-primary)]">
          {title}
        </h1>
        {description && (
          <p className={`mt-3 max-w-[72ch] text-sm leading-relaxed ${tokens.colors.text.secondary}`}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </section>
  );
}

export function PageSurface({children, className = ""}: SurfaceProps) {
  return (
    <section className={`${tokens.colors.background.surface} ${tokens.colors.border.base} rounded-lg border ${className}`}>
      {children}
    </section>
  );
}
