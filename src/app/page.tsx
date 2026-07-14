"use client";

import {useTranslation} from "react-i18next";
import Link from "next/link";
import {UnifiedLayout} from "@/shared/ui/layout/UnifiedLayout";
import {navigation} from "@/shared/config";
import {PageHeader, PageShell, PageSurface} from "@/shared/ui";
import {tokens} from "@/shared/tokens";
import {OperatorDashboard} from "@/features/dashboard/OperatorDashboard";

export default function HomePage() {
  const {t} = useTranslation();

  // Hub dropdown'larinin tum alt yuzeyleri (F7): panodan da dogrudan erisim.
  const operations = navigation.flatMap((item) => item.children ?? []).filter((item) => item.href);

  return (
    <UnifiedLayout>
      <PageShell>
        <PageHeader
          meta="Operatör panosu"
          title={t("home.title")}
          description="Çalışma, ritim, eser takip, kaynak yönetimi ve yerel operasyon ekranları tek girişten yönetilir."
        />

        <OperatorDashboard />

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
