"use client";

import dynamic from "next/dynamic";
import type {CanonicalScoreDocument, CanonicalScoreEvent} from "@/data/score-engine/canonical-score";
import {ScoreSurfaceVex} from "@/features/score-engine/workbench/ScoreSurfaceVex";
import type {VisibleScoreLayers} from "@/features/score-engine/workbench/score-format";

export type ScoreRenderer = "verovio" | "vexflow";

const ScoreSurfaceVerovio = dynamic(
  () => import("@/features/score-engine/workbench/ScoreSurfaceVerovio").then((mod) => mod.ScoreSurfaceVerovio),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-4 py-6 text-sm text-[var(--color-text-secondary)]">
        Verovio lazy-load hazırlanıyor…
      </div>
    ),
  },
);

export function getScoreRenderer(): ScoreRenderer {
  const raw = process.env.NEXT_PUBLIC_SCORE_RENDERER;
  if (raw === "vexflow") return "vexflow";
  return "verovio";
}

export function ScoreSurfaceRouter({
  document,
  activeEvent,
  visibleLayers,
  renderer,
}: {
  document: CanonicalScoreDocument;
  activeEvent: CanonicalScoreEvent | null;
  visibleLayers: VisibleScoreLayers;
  renderer?: ScoreRenderer;
}) {
  const resolved: ScoreRenderer = renderer ?? getScoreRenderer();
  if (resolved === "vexflow") {
    return <ScoreSurfaceVex document={document} activeEvent={activeEvent} visibleLayers={visibleLayers} />;
  }
  return <ScoreSurfaceVerovio document={document} activeEvent={activeEvent} visibleLayers={visibleLayers} />;
}
