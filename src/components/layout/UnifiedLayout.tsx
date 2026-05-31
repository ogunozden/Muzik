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

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: "var(--color-bg-base)"}}>
      {/* Header */}
      <header 
        className="sticky top-0 z-50"
        style={{
          backgroundColor: "var(--color-primary-500)",
          boxShadow: "var(--shadow-sm)"
        }}
        role="banner"
      >
        <div 
          className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3 sm:px-6 md:flex-row md:items-center md:justify-between"
        >
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            aria-label={appConfig.fullName}
          >
            <span className="text-2xl" aria-hidden="true">🎵</span>
            <span className="text-xl font-semibold text-white">{t("common.appName")}</span>
          </Link>

          {/* Navigation */}
          <nav 
            className="flex w-full items-center gap-1 overflow-x-auto pb-1 md:w-auto md:overflow-visible md:pb-0"
            role="navigation" 
            aria-label="Main navigation"
          >
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href ?? "/"}
                  className={`
                    shrink-0 px-3 py-1.5 text-sm rounded-md transition-all duration-150
                    ${isActive
                      ? "bg-white/20 font-medium text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                    }
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="flex items-center gap-2">
                    {item.icon && <span aria-hidden="true">{item.icon}</span>}
                    {t(item.label)}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1" role="main">
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
