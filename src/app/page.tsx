"use client";

import {useTranslation} from "react-i18next";
import Link from "next/link";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {MAKAM_DATA} from "@/engines/makam/data";
import {USUL_DATA} from "@/engines/usul/data";
import {tokens} from "@/lib/tokens";

export default function HomePage() {
  const {t} = useTranslation();

  const displayMakams = MAKAM_DATA.slice(0, 4);
  const displayUsuls = USUL_DATA.slice(0, 4);

  return (
    <UnifiedLayout>
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="max-w-2xl mb-20">
          <h1 className={`text-5xl font-bold ${tokens.colors.text.primary} mb-4 leading-tight`}>
            {t("home.title")}
          </h1>
          <p className={`text-xl ${tokens.colors.text.secondary} leading-relaxed`}>
            {t("home.subtitle")}
          </p>
        </div>

        {/* Module Cards - Asimetrik Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Makam Card */}
          <Link
            href="/makam"
            className="group md:col-span-5 block bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-3xl" aria-hidden="true">🎼</span>
              <span className={`text-xs ${tokens.colors.text.secondary} opacity-0 group-hover:opacity-100 transition-opacity`}>
                Keşfet →
              </span>
            </div>
            <h2 className={`text-xl font-semibold ${tokens.colors.primary.base} mb-2`}>
              {t("home.makamCard")}
            </h2>
            <p className={`text-sm ${tokens.colors.text.secondary} mb-5 leading-relaxed`}>
              {t("home.makamDesc")}
            </p>
            <div className="flex flex-wrap gap-2">
              {displayMakams.map((m) => (
                <span
                  key={m.id}
                  className={`${tokens.colors.background.base} ${tokens.colors.text.primary} ${tokens.radius.md} text-xs px-2.5 py-1 border border-[var(--color-border)]`}
                >
                  {m.name}
                </span>
              ))}
              <span className={`text-xs ${tokens.colors.text.secondary}`}>
                +{MAKAM_DATA.length - 4} more
              </span>
            </div>
          </Link>

          {/* Usul Card */}
          <Link
            href="/usul"
            className="group md:col-span-5 block bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-3xl" aria-hidden="true">🥁</span>
              <span className={`text-xs ${tokens.colors.text.secondary} opacity-0 group-hover:opacity-100 transition-opacity`}>
                Çal →
              </span>
            </div>
            <h2 className={`text-xl font-semibold ${tokens.colors.secondary.base} mb-2`}>
              {t("home.usulCard")}
            </h2>
            <p className={`text-sm ${tokens.colors.text.secondary} mb-5 leading-relaxed`}>
              {t("home.usulDesc")}
            </p>
            <div className="flex flex-wrap gap-2">
              {displayUsuls.map((u) => (
                <span
                  key={u.id}
                  className={`${tokens.colors.background.base} ${tokens.colors.text.primary} ${tokens.radius.md} text-xs px-2.5 py-1 border border-[var(--color-border)]`}
                >
                  {u.name}
                </span>
              ))}
              <span className={`text-xs ${tokens.colors.text.secondary}`}>
                +{USUL_DATA.length - 4} more
              </span>
            </div>
          </Link>

          {/* Nota Editor Card - Dikey */}
          <Link
            href="/nota-editor"
            className="group md:col-span-2 md:row-span-2 block bg-[var(--color-accent)] rounded-xl p-6 hover:shadow-md transition-shadow text-white"
          >
            <div className="flex flex-col h-full">
              <span className="text-3xl mb-auto" aria-hidden="true">✏️</span>
              <div>
                <h2 className="text-lg font-semibold mb-2">
                  {t("home.notaCard")}
                </h2>
                <p className="text-sm text-white/80 leading-relaxed">
                  {t("home.notaDesc")}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-20 pt-8 border-t border-[var(--color-border)]">
          <div className="flex flex-wrap gap-6 text-sm">
            <Link href="/archive" className={`${tokens.colors.text.secondary} hover:${tokens.colors.text.primary} transition-colors`}>
              📚 Arşiv
            </Link>
            <Link href="/tutorial" className={`${tokens.colors.text.secondary} hover:${tokens.colors.text.primary} transition-colors`}>
              📖 Eğitim
            </Link>
            <Link href="/ensemble" className={`${tokens.colors.text.secondary} hover:${tokens.colors.text.primary} transition-colors`}>
              🎻 Ensemble
            </Link>
            <Link href="/sesler" className={`${tokens.colors.text.secondary} hover:${tokens.colors.text.primary} transition-colors`}>
              🎹 Sesler
            </Link>
          </div>
        </div>
      </div>
    </UnifiedLayout>
  );
}
