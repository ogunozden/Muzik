"use client";

import {ReactNode} from "react";
import {useTranslation} from "react-i18next";
import Link from "next/link";

interface UnifiedLayoutProps {
  children: ReactNode;
}

export function UnifiedLayout({children}: UnifiedLayoutProps) {
  const {t} = useTranslation();
  const navItems = [
    {href: "/", label: t("nav.home")},
    {href: "/makam", label: t("nav.makam")},
    {href: "/usul", label: t("nav.usul")},
    {href: "/archive", label: t("nav.archive")},
    {href: "/tutorial", label: t("nav.tutorial")},
    {href: "/ensemble", label: t("nav.ensemble")},
    {href: "/sesler", label: t("nav.sounds")},
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[var(--color-primary)] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-xl font-bold">{t("common.appName")}</div>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1 text-sm text-white transition-colors hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 bg-[var(--color-background)]">
        {children}
      </main>

      <footer className="bg-[var(--color-primary)] text-white py-4 text-center text-sm">
        <p>© 2026 Muzik - Türk Müziği Platformu</p>
      </footer>
    </div>
  );
}
