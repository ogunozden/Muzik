"use client";

import {useState} from "react";
import {UnifiedLayout} from "@/shared/ui/layout/UnifiedLayout";
import {CanonicalScorePrototype} from "@/features/score-engine/CanonicalScorePrototype";
import {StudioTabs} from "@/features/studio/StudioTabs";
import {tokens} from "@/shared/tokens";
import type {ScoreRenderer} from "@/features/score-engine/workbench/ScoreSurfaceRouter";

type LabRenderer = ScoreRenderer | "both";

export default function ScoreEnginePage() {
  const envDefault = (process.env.NEXT_PUBLIC_SCORE_RENDERER as ScoreRenderer | undefined) ?? "verovio";
  const [labRenderer, setLabRenderer] = useState<LabRenderer>(envDefault);

  return (
    <UnifiedLayout>
      <StudioTabs />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex flex-col gap-3 rounded-md border border-[var(--color-border-default)] bg-white px-4 py-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Score Engine Lab · Dual Render</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              VexFlow kanıtlı fallback · Verovio MEI (53-EDO accid.ges) varsayılan, lazy-load. Bayrak: NEXT_PUBLIC_SCORE_RENDERER=verovio|vexflow (default verovio)
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Env default: <span className="font-semibold text-[var(--color-text-primary)]">{envDefault}</span> · Lab seçimi:{" "}
              <span className="font-semibold text-[var(--color-primary-700)]">{labRenderer}</span> · Stub is OK, full engraving TODO (beam/tuplet/barline-split).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={labRenderer === "verovio"}
              onClick={() => setLabRenderer("verovio")}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                labRenderer === "verovio"
                  ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                  : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]"
              }`}
            >
              Verovio (default)
            </button>
            <button
              type="button"
              aria-pressed={labRenderer === "vexflow"}
              onClick={() => setLabRenderer("vexflow")}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                labRenderer === "vexflow"
                  ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                  : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]"
              }`}
            >
              VexFlow (fallback)
            </button>
            <button
              type="button"
              aria-pressed={labRenderer === "both"}
              onClick={() => setLabRenderer("both")}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                labRenderer === "both"
                  ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                  : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]"
              }`}
            >
              Yan yana (lab)
            </button>
          </div>
        </div>
      </div>
      <CanonicalScorePrototype renderer={labRenderer} />
    </UnifiedLayout>
  );
}
