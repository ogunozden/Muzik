"use client";

import {useTranslation} from "react-i18next";
import Link from "next/link";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {MAKAM_DATA} from "@/engines/makam/data";
import {USUL_DATA} from "@/engines/usul/data";
import {navigation} from "@/shared/config";
import {PageHeader, PageShell, PageSurface} from "@/shared/ui";
import {tokens} from "@/shared/tokens";

export default function HomePage() {
  const {t} = useTranslation();

  const primaryWorkflows = [
    {
      href: "/studio",
      icon: "🎼",
      title: t("home.studioCard"),
      description: t("home.studioDesc"),
      metric: `${MAKAM_DATA.length} makam`,
      action: "Çalışma stüdyosunu aç",
    },
    {
      href: "/studio/follow",
      icon: "🎧",
      title: t("home.followCard"),
      description: t("home.followDesc"),
      metric: "SymbTr takip",
      action: "Eser takip ekranına git",
    },
    {
      href: "/rhythm",
      icon: "🥁",
      title: t("home.rhythmCard"),
      description: t("home.rhythmDesc"),
      metric: `${USUL_DATA.length} usul`,
      action: "Ritim çalış",
    },
  ];

  const operations = navigation.filter((item) => item.href && !["studio", "studioFollow", "rhythm"].includes(item.id));

  return (
    <UnifiedLayout>
      <PageShell>
        <PageHeader
          meta="Ürün merkezi"
          title={t("home.title")}
          description="Çalışma, ritim, eser takip, kaynak yönetimi ve yerel operasyon ekranları tek girişten yönetilir."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {primaryWorkflows.map((workflow) => (
            <Link
              key={workflow.href}
              href={workflow.href}
              className="group rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-2xl" aria-hidden="true">{workflow.icon}</span>
                <span className={`rounded-md border border-[var(--color-border-subtle)] px-2 py-1 text-xs ${tokens.colors.text.secondary}`}>
                  {workflow.metric}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">{workflow.title}</h2>
              <p className={`mt-2 min-h-12 text-sm leading-relaxed ${tokens.colors.text.secondary}`}>{workflow.description}</p>
              <p className="mt-5 text-sm font-medium text-[var(--color-primary-700)] group-hover:text-[var(--color-primary-600)]">
                {workflow.action}
              </p>
            </Link>
          ))}
        </div>

        <PageSurface className="mt-6 overflow-hidden">
          <div className="border-b border-[var(--color-border-subtle)] px-5 py-4">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Operasyon yüzeyleri</h2>
            <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>
              Veri, kaynak, ses ve arşiv ekranları ayrı amaçlara ayrılmıştır; redirect alias sayfalar bu listede tekrarlanmaz.
            </p>
          </div>
          <div className="grid divide-y divide-[var(--color-border-subtle)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {operations.map((item) => (
              <Link
                key={item.id}
                href={item.href ?? "/"}
                className="flex min-h-28 flex-col justify-between gap-3 p-5 transition-colors hover:bg-[var(--color-bg-muted)]"
              >
                <span className={`text-sm font-semibold ${tokens.colors.text.primary}`}>
                  {item.icon && <span aria-hidden="true">{item.icon} </span>}
                  {t(item.label)}
                </span>
                <span className={`text-xs ${tokens.colors.text.secondary}`}>
                  {item.href}
                </span>
              </Link>
            ))}
          </div>
        </PageSurface>
      </PageShell>
    </UnifiedLayout>
  );
}
