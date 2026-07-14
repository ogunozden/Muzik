"use client";

import Link from "next/link";
import {useTranslation} from "react-i18next";
import {useAsyncResource} from "@/shared/api/useAsyncResource";
import {tokens} from "@/shared/tokens";

/**
 * Operator panosu (F7.5): landing degil, calisma istasyonu girisi. Canonical
 * dokuman/kalite durumu ve kayitli eser sayisi canli olarak API'den okunur;
 * hub'lara hizli gecis verir. Kaynak: ADR 0001 (local-first workbench).
 */

interface DashboardDocument {
  id: string;
  title: string;
  eventCount: number;
  validation: {ok: boolean};
  quality: {status: "ready" | "needs-review" | "blocked"; score: number};
}

interface DocumentsResponse {
  documents: DashboardDocument[];
}

interface ScoresResponse {
  scores: Array<{id: string; title: string; updatedAt: string}>;
}

interface HubLink {
  href: string;
  icon: string;
  titleKey: string;
  descKey: string;
}

const HUBS: readonly HubLink[] = [
  {href: "/studio/score-engine", icon: "🎼", titleKey: "dashboard.hubStudioTitle", descKey: "dashboard.hubStudioDesc"},
  {href: "/studio/follow", icon: "🎧", titleKey: "dashboard.hubFollowTitle", descKey: "dashboard.hubFollowDesc"},
  {href: "/references/curation", icon: "🗂️", titleKey: "dashboard.hubCurationTitle", descKey: "dashboard.hubCurationDesc"},
  {href: "/archive", icon: "📚", titleKey: "dashboard.hubLibraryTitle", descKey: "dashboard.hubLibraryDesc"},
];

function StatTile({label, value, tone = "neutral"}: {label: string; value: string; tone?: "neutral" | "success" | "warning"}) {
  const accent =
    tone === "success"
      ? "var(--color-primary-600)"
      : tone === "warning"
        ? "var(--color-error)"
        : "var(--color-text-primary)";
  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3">
      <p className={`text-[11px] font-semibold uppercase ${tokens.colors.text.secondary}`}>{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{color: accent}}>
        {value}
      </p>
    </div>
  );
}

export function OperatorDashboard() {
  const {t} = useTranslation();
  const documentsState = useAsyncResource<DocumentsResponse>("/api/score-engine/documents");
  const scoresState = useAsyncResource<ScoresResponse>("/api/scores");

  const documents = documentsState.data?.documents ?? [];
  const reachable = documents.filter((doc) => doc.eventCount > 0 && doc.validation.ok);
  const blocked = documents.filter((doc) => doc.quality.status === "blocked");
  const savedScores = scoresState.data?.scores ?? [];
  const lastScore = [...savedScores].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;

  const documentsMetric = documentsState.isLoading ? "…" : `${reachable.length}/${documents.length}`;
  const blockedMetric = documentsState.isLoading ? "…" : String(blocked.length);
  const scoresMetric = scoresState.isLoading ? "…" : String(savedScores.length);

  return (
    <div className="grid gap-6">
      <section aria-label={t("dashboard.reachableDocuments")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t("dashboard.reachableDocuments")} value={documentsMetric} tone="success" />
        <StatTile
          label={t("dashboard.blockedQuality")}
          value={blockedMetric}
          tone={blocked.length > 0 ? "warning" : "neutral"}
        />
        <StatTile label={t("dashboard.savedScores")} value={scoresMetric} />
        <StatTile label={t("dashboard.lastScore")} value={lastScore ? lastScore.title : "—"} />
      </section>

      {(documentsState.error || scoresState.error) && (
        <p className="text-sm text-[var(--color-error)]" role="alert">
          {t("dashboard.statusError")}: {documentsState.error ?? scoresState.error}
        </p>
      )}

      <section aria-label={t("dashboard.open")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HUBS.map((hub) => (
          <Link
            key={hub.href}
            href={hub.href}
            className="group rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 transition-shadow hover:shadow-md"
          >
            <span className="text-2xl" aria-hidden="true">
              {hub.icon}
            </span>
            <h2 className="mt-3 text-base font-semibold text-[var(--color-text-primary)]">{t(hub.titleKey)}</h2>
            <p className={`mt-1 text-sm leading-relaxed ${tokens.colors.text.secondary}`}>{t(hub.descKey)}</p>
            <p className="mt-4 text-sm font-medium text-[var(--color-primary-700)] group-hover:text-[var(--color-primary-600)]">
              {t("dashboard.open")} →
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
