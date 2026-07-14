"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {tokens} from "@/shared/tokens";

export interface HubTab {
  href: string;
  label: string;
}

/**
 * Hub ici sekme cubugu (F7.2/7.3/7.4): ayri route'lar tek yuzey gibi gezilir.
 * Rota/guardrail yapisini bozmaz; aktif sekme `aria-current` ile isaretlenir.
 * En uzun eslesen href aktif kabul edilir (nested route'lar dogru vurgulanir).
 */
export function HubTabs({label, tabs}: {label: string; tabs: readonly HubTab[]}) {
  const pathname = usePathname() ?? "";
  const activeHref = tabs
    .map((tab) => tab.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav
      aria-label={label}
      className="mb-4 flex flex-wrap gap-1 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-1"
    >
      {tabs.map((tab) => {
        const isActive = tab.href === activeHref;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--color-primary-500)] text-white"
                : `${tokens.colors.text.secondary} hover:bg-[var(--color-bg-muted)]`
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
