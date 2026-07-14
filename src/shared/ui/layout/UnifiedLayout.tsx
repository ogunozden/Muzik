/**
 * UnifiedLayout - Ana Sayfa Layout
 * 
 * Header, footer ve main content içerir
 */

"use client";

import {ReactNode} from "react";
import {useTranslation} from "react-i18next";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {appConfig, navigation} from "@/shared/config";

interface UnifiedLayoutProps {
  children: ReactNode;
}

export function UnifiedLayout({children}: UnifiedLayoutProps) {
  const {t} = useTranslation();
  const pathname = usePathname();

  const allHrefs = navigation.flatMap((item) => [
    item.href,
    ...(item.children ?? []).map((child) => child.href),
  ]);
  const activeHref = allHrefs
    .filter((href): href is string => Boolean(href))
    .filter((href) => href === pathname || (href !== "/" && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];

  const isHubActive = (item: (typeof navigation)[number]): boolean =>
    (item.children ?? []).some((child) => child.href === activeHref);

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: "var(--color-bg-base)"}}>
      {/* Skip-to-content: klavye kullanicilari nav'i atlayip icerige gecer (a11y, F5.5) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[var(--color-primary-600)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        İçeriğe geç
      </a>
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: "var(--color-primary-500)",
          boxShadow: "var(--shadow-sm)"
        }}
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex shrink-0 items-center gap-3 hover:opacity-90 transition-opacity"
            aria-label={appConfig.fullName}
          >
            <span className="text-2xl" aria-hidden="true">🎵</span>
            <span className="text-xl font-semibold text-white">{t("common.appName")}</span>
          </Link>

          {/* Navigation */}
          <nav
            className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:justify-end lg:overflow-visible lg:pb-0"
            role="navigation"
            aria-label="Main navigation"
          >
            {navigation.map((item) => {
              // Duz link (hub disi) — geriye uyumlu destek
              if (item.type !== "dropdown") {
                const isActive = item.href === activeHref;
                return (
                  <Link
                    key={item.id}
                    href={item.href ?? "/"}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition-all duration-150 ${
                      isActive ? "bg-white/20 font-medium text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {item.icon && <span aria-hidden="true">{item.icon}</span>}
                      <span className="truncate">{t(item.label)}</span>
                    </span>
                  </Link>
                );
              }

              // Hub dropdown — native details/summary (klavye-erisilebilir, sifir-JS)
              const hubActive = isHubActive(item);
              return (
                <details key={item.id} className="group relative shrink-0">
                  <summary
                    className={`flex cursor-pointer list-none items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-all duration-150 ${
                      hubActive ? "bg-white/20 font-medium text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                    aria-current={hubActive ? "true" : undefined}
                  >
                    {item.icon && <span aria-hidden="true">{item.icon}</span>}
                    <span className="truncate">{t(item.label)}</span>
                    <span aria-hidden="true" className="text-xs opacity-70">▾</span>
                  </summary>
                  <div
                    className="absolute left-0 z-50 mt-1 min-w-52 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-1 shadow-lg"
                    role="menu"
                    aria-label={t(item.label)}
                  >
                    {(item.children ?? []).map((child) => {
                      const childActive = child.href === activeHref;
                      return (
                        <Link
                          key={child.id}
                          href={child.href ?? "/"}
                          role="menuitem"
                          className={`flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors ${
                            childActive
                              ? "bg-[var(--color-primary-50)] font-medium text-[var(--color-primary-700)]"
                              : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-muted)]"
                          }`}
                          aria-current={childActive ? "page" : undefined}
                        >
                          {child.icon && <span aria-hidden="true">{child.icon}</span>}
                          <span>{t(child.label)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" tabIndex={-1}>
        {children}
      </main>

      {/* Footer */}
      <footer 
        className="py-6"
        style={{
          backgroundColor: "var(--color-bg-surface)",
          borderTop: "1px solid var(--color-border-subtle)"
        }}
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto px-6">
          <p 
            className="text-sm text-center"
            style={{color: "var(--color-text-secondary)"}}
          >
            © 2026 {appConfig.name} - Türk Müziği Platformu
          </p>
        </div>
      </footer>
    </div>
  );
}
