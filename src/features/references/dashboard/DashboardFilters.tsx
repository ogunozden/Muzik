"use client";

import {tokens} from "@/shared/tokens";

interface MetricCard {
  label: string;
  value: string;
  meta: string;
}

interface DashboardFiltersProps {
  metrics: MetricCard[];
}

export function DashboardFilters({metrics}: DashboardFiltersProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => (
        <article key={metric.label} className={`border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} p-4`}>
          <div className={`text-xs uppercase ${tokens.colors.text.secondary}`}>{metric.label}</div>
          <div className={`mt-2 text-2xl font-semibold ${tokens.colors.text.primary}`}>{metric.value}</div>
          <div className={`mt-1 truncate text-xs ${tokens.colors.text.secondary}`}>{metric.meta}</div>
        </article>
      ))}
    </section>
  );
}
