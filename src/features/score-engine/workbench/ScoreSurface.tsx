"use client";

import {tokens} from "@/shared/tokens";
import {SCORE_SURFACE_COLORS} from "@/shared/tokens/visual-palettes";
import type {CanonicalScoreDocument, CanonicalScoreEvent} from "@/data/score-engine/canonical-score";
import {
  EVIDENCE_BOTTOM_GAP,
  SCORE_PADDING_X,
  STAVE_HEIGHT,
  STAVE_TOP_IN_SYSTEM,
  SURFACE_HEADER_HEIGHT,
  formatKeySignaturePolicy,
  formatNotationLabel,
  formatPercent,
  getSystemLabel,
  type VisibleScoreLayers,
} from "@/features/score-engine/workbench/score-format";
import {useScoreSurface} from "@/features/score-engine/workbench/useScoreSurface";

export function StatusPill({label, tone = "success"}: {label: string; tone?: "success" | "warning" | "neutral"}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)]";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>{label}</span>;
}

export function WorkbenchMetric({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-2">
      <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}

export function ConfidenceBar({label, value}: {label: string; value: number}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--color-text-secondary)]">
        <span>{label}</span>
        <span>{formatPercent(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
        <div className="h-full rounded-full bg-[var(--color-primary-500)]" style={{width: `${Math.round(value * 100)}%`}} />
      </div>
    </div>
  );
}

export function ScoreSurface({
  document,
  activeEvent,
  visibleLayers,
}: {
  document: CanonicalScoreDocument;
  activeEvent: CanonicalScoreEvent | null;
  visibleLayers: VisibleScoreLayers;
}) {
  const {
    activeCallout,
    activePosition,
    activeSystemLayout,
    containerRef,
    glyphClassMapText,
    notationMapText,
    renderError,
    scrollHostRef,
    sectionMarkerPositions,
    source,
    surfaceHeight,
    surfaceWidth,
    systemLayouts,
  } = useScoreSurface({document, activeEvent, visibleLayers});

  return (
    <div
      ref={scrollHostRef}
      className="overflow-x-auto rounded-md border border-[var(--color-border-default)] bg-white shadow-sm"
    >
      <div
        className="relative"
        style={{
          backgroundColor: SCORE_SURFACE_COLORS.paper,
          backgroundImage: visibleLayers.grid
            ? `linear-gradient(${SCORE_SURFACE_COLORS.paperGrid} 1px, transparent 1px), linear-gradient(90deg, ${SCORE_SURFACE_COLORS.paperGrid} 1px, transparent 1px)`
            : undefined,
          backgroundSize: "34px 34px",
          height: `${surfaceHeight}px`,
          width: `${surfaceWidth}px`,
        }}
      >
        <div className="absolute left-[54px] top-[36px] z-10 max-w-[720px]">
          <p className="text-lg font-bold text-[var(--color-primary-700)]">{document.title}</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {document.makam} · {document.usul} · {document.meter} · {document.ahenkLabel}
          </p>
        </div>
        <div className="absolute right-[72px] top-[48px] z-10 text-xs font-bold text-[var(--color-primary-700)]">
          VexFlow canonical render
        </div>
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${surfaceWidth} ${surfaceHeight}`}
          className="pointer-events-none absolute inset-0 z-0 h-full"
          style={{width: `${surfaceWidth}px`}}
        >
          {visibleLayers.cursor && activeSystemLayout && (
            <rect
              x={activeSystemLayout.x + 4}
              y={activeSystemLayout.y + STAVE_TOP_IN_SYSTEM - 18}
              width={Math.max(activeSystemLayout.width - 8, 24)}
              height={STAVE_HEIGHT + 36}
              rx="6"
              fill={SCORE_SURFACE_COLORS.activeSystemFill}
              stroke={SCORE_SURFACE_COLORS.staffStroke}
              strokeWidth="1.4"
              opacity="0.72"
            />
          )}
        </svg>
        <div
          ref={containerRef}
          role="img"
          aria-label="Canonical score engine VexFlow temiz nota yüzeyi"
          data-testid="vexflow-score-surface"
          className="absolute inset-0 z-10 [&_svg]:block"
        />
        {renderError && (
          <div className="absolute left-[54px] top-[128px] z-20 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {renderError}
          </div>
        )}
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${surfaceWidth} ${surfaceHeight}`}
          className="pointer-events-none absolute inset-0 z-20 h-full"
          style={{width: `${surfaceWidth}px`}}
        >
          {visibleLayers.measureLabels &&
            systemLayouts.map((layout) => (
              <text key={layout.id} x={layout.x + 12} y={layout.y + STAVE_TOP_IN_SYSTEM - 24} fill={SCORE_SURFACE_COLORS.systemLabel} fontSize="12">
                {getSystemLabel(layout)}
              </text>
            ))}
          {visibleLayers.measureLabels && (
            <g data-testid="score-usul-label">
              <text x={SCORE_PADDING_X + 12} y={SURFACE_HEADER_HEIGHT + STAVE_TOP_IN_SYSTEM - 46} fill={SCORE_SURFACE_COLORS.headerLabel} fontSize="12" fontWeight="700">
                USUL: {document.usul} · {document.meter}
              </text>
            </g>
          )}
          {visibleLayers.measureLabels && (
            <g data-testid="score-key-signature-policy">
              <text x={SCORE_PADDING_X + 224} y={SURFACE_HEADER_HEIGHT + STAVE_TOP_IN_SYSTEM - 46} fill={SCORE_SURFACE_COLORS.headerLabel} fontSize="12" fontWeight="700">
                KEY: {formatKeySignaturePolicy(document)}
              </text>
            </g>
          )}
          {visibleLayers.measureLabels &&
            sectionMarkerPositions.map((marker) => (
              <g key={marker.id} data-testid="score-section-marker">
                <rect
                  x={marker.x}
                  y={marker.y - 17}
                  width={Math.max(68, marker.label.length * 7 + 20)}
                  height="24"
                  rx="12"
                  fill={SCORE_SURFACE_COLORS.paper}
                  stroke={SCORE_SURFACE_COLORS.staffStroke}
                  strokeWidth="1.1"
                />
                <text x={marker.x + 10} y={marker.y - 1} fill={SCORE_SURFACE_COLORS.headerLabel} fontSize="12" fontWeight="700">
                  {marker.label}
                </text>
              </g>
            ))}
          {visibleLayers.cursor && activePosition && (
            <g>
              <line
                x1={activePosition.x}
                x2={activePosition.x}
                y1={(activeSystemLayout?.y ?? 0) + STAVE_TOP_IN_SYSTEM - 22}
                y2={(activeSystemLayout?.y ?? 0) + STAVE_TOP_IN_SYSTEM + STAVE_HEIGHT + 24}
                stroke={SCORE_SURFACE_COLORS.active}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx={activePosition.x} cy={activePosition.y} r="19" fill="none" stroke={SCORE_SURFACE_COLORS.active} strokeWidth="4" />
            </g>
          )}
          {visibleLayers.cursor && activePosition && activeEvent && activeCallout && (
            <g>
              <rect
                x={activeCallout.x}
                y={activeCallout.y}
                width="104"
                height="26"
                rx="13"
                fill={SCORE_SURFACE_COLORS.paper}
                stroke={SCORE_SURFACE_COLORS.active}
                strokeWidth="1.3"
              />
              <text x={activeCallout.x + 13} y={activeCallout.y + 17} fill={SCORE_SURFACE_COLORS.active} fontSize="12" fontWeight="700">
                {formatNotationLabel(activeEvent.pitch.solfege)}
              </text>
              <text
                x={activePosition.x}
                y={activePosition.labelY}
                textAnchor="middle"
                fill={SCORE_SURFACE_COLORS.active}
                fontSize="12"
                fontWeight="700"
              >
                {formatNotationLabel(activeEvent.pitch.solfege)}
              </text>
            </g>
          )}
          {visibleLayers.evidence && source && (
            <g>
              <rect x="54" y={surfaceHeight - EVIDENCE_BOTTOM_GAP + 6} width="326" height="20" rx="10" fill={SCORE_SURFACE_COLORS.evidenceFill} stroke={SCORE_SURFACE_COLORS.evidenceStroke} />
              <text x="68" y={surfaceHeight - EVIDENCE_BOTTOM_GAP + 20} fill={SCORE_SURFACE_COLORS.evidenceText} fontSize="12">
                {source.kind} · source {formatPercent(source.confidence.source)} · pitch {formatPercent(source.confidence.pitch)}
              </text>
            </g>
          )}
        </svg>
        <pre data-testid="canonical-vex-map" className="sr-only">
          {notationMapText}
        </pre>
        <pre data-testid="score-glyph-class-map" className="sr-only">
          {glyphClassMapText}
        </pre>
        <pre data-testid="score-render-systems" className="sr-only">
          {systemLayouts
            .map(
              (system) =>
                `${system.id}:${system.measureId}:${system.segmentIndex + 1}/${system.segmentCount}:${system.eventIds.length}:${system.startBeat}-${system.endBeat}`,
            )
            .join("\n")}
        </pre>
      </div>
    </div>
  );
}
