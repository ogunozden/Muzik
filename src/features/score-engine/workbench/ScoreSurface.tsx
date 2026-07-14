"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {computePolicyDerivedNaturals, mapCanonicalEventToVex} from "@/data/score-engine/notation";
import type {CanonicalScoreDocument, CanonicalScoreEvent} from "@/data/score-engine/canonical-score";
import {tokens} from "@/shared/tokens";
import {findRenderSystemForEvent} from "../score-layout";
import {
  EVIDENCE_BOTTOM_GAP,
  SCORE_PADDING_X,
  STAVE_HEIGHT,
  STAVE_TOP_IN_SYSTEM,
  SURFACE_HEADER_HEIGHT,
  buildGlyphClassMapText,
  formatKeySignaturePolicy,
  formatKomaAccidental,
  formatNotationLabel,
  formatPercent,
  getSurfaceHeight,
  getSurfaceWidth,
  getSystemLabel,
  getSystemLayouts,
  parseMeter,
  type NoteRenderPosition,
  type SectionMarkerPosition,
  type VisibleScoreLayers,
} from "./score-format";

export function StatusPill({label, tone = "success"}: {label: string; tone?: "success" | "warning" | "neutral"}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)]";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>{label}</span>
  );
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
  const containerRef = useRef<HTMLDivElement>(null);
  const source = document.sources[0];
  const surfaceWidth = useMemo(() => getSurfaceWidth(), []);
  const systemLayouts = useMemo(() => getSystemLayouts(document, surfaceWidth), [document, surfaceWidth]);
  const surfaceHeight = useMemo(() => getSurfaceHeight(systemLayouts.length), [systemLayouts.length]);
  const mappedEvents = useMemo(() => document.events.map(mapCanonicalEventToVex), [document]);
  const mappedEventsById = useMemo(
    () => new Map(mappedEvents.map((mappedEvent) => [mappedEvent.event.id, mappedEvent])),
    [mappedEvents],
  );
  const notationMapText = useMemo(
    () =>
      mappedEvents
        .map(
          (mappedEvent) =>
            `${mappedEvent.event.id}:${mappedEvent.pitch.key}:${mappedEvent.duration.duration}:${
              mappedEvent.duration.dotted ? "dotted" : "plain"
            }:${mappedEvent.pitch.komaAccidental ?? "none"}`,
        )
        .join("\n"),
    [mappedEvents],
  );
  const glyphClassMapText = useMemo(() => buildGlyphClassMapText(document), [document]);
  const policyNaturals = useMemo(() => computePolicyDerivedNaturals(document.events), [document]);
  const [notePositions, setNotePositions] = useState<NoteRenderPosition[]>([]);
  const [renderError, setRenderError] = useState<string | null>(null);
  const activeSystem = findRenderSystemForEvent(systemLayouts, activeEvent?.id);
  const activeSystemLayout = activeSystem
    ? systemLayouts.find((layout) => layout.id === activeSystem.id) ?? null
    : null;
  const activePosition = activeEvent ? notePositions.find((position) => position.id === activeEvent.id) ?? null : null;
  const activeCallout =
    activePosition && activeSystemLayout
      ? {
          x: Math.min(
            Math.max(activePosition.x + 12, activeSystemLayout.x + 12),
            activeSystemLayout.x + activeSystemLayout.width - 128,
          ),
          y: activeSystemLayout.y + STAVE_TOP_IN_SYSTEM - 62,
        }
      : null;
  const sectionMarkerPositions = useMemo<SectionMarkerPosition[]>(() => {
    const eventById = new Map(document.events.map((event) => [event.id, event]));
    const firstEventIdBySection = new Map<string, string>();
    for (const section of document.sections) {
      const firstEventId = section.eventIds.find((eventId) => eventById.has(eventId));
      if (firstEventId) firstEventIdBySection.set(section.id, firstEventId);
    }

    return document.sections
      .map((section) => {
        const firstEventId = firstEventIdBySection.get(section.id);
        const position = firstEventId ? notePositions.find((candidate) => candidate.id === firstEventId) : null;
        const system = position ? systemLayouts.find((layout) => layout.id === position.systemId) : null;
        if (!position || !system) return null;
        return {
          id: section.id,
          label: section.label,
          systemId: position.systemId,
          x: Math.min(Math.max(position.x - 116, system.x + 112), system.x + system.width - 132),
          y: system.y + STAVE_TOP_IN_SYSTEM - 40,
        };
      })
      .filter((marker): marker is SectionMarkerPosition => Boolean(marker));
  }, [document.events, document.sections, notePositions, systemLayouts]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    container.innerHTML = "";
    setRenderError(null);

    void (async () => {
      try {
        const {Accidental, Annotation, Beam, Dot, Formatter, Renderer, Stave, StaveNote, Voice} = await import("vexflow");
        if (cancelled) return;

        const renderer = new Renderer(container, Renderer.Backends.SVG);
        renderer.resize(surfaceWidth, surfaceHeight);
        const context = renderer.getContext();
        context.setFont("Arial", 10);

        const renderedPositions: NoteRenderPosition[] = [];
        const scoreMeter = parseMeter(document.meter);
        const eventsById = new Map(document.events.map((event) => [event.id, event]));

        for (const systemLayout of systemLayouts) {
          const staveTop = systemLayout.y + STAVE_TOP_IN_SYSTEM;
          const staveBottom = staveTop + STAVE_HEIGHT;
          const stave = new Stave(systemLayout.x, staveTop, systemLayout.width);
          stave.addClef("treble");
          if (systemLayout.measureIndex === 1 && systemLayout.segmentIndex === 0) {
            stave.addTimeSignature(document.meter);
          }
          stave.setContext(context).draw();

          const systemEvents = systemLayout.eventIds
            .map((eventId) => eventsById.get(eventId))
            .filter((event): event is CanonicalScoreEvent => Boolean(event));
          const staveNotes = systemEvents.map((event) => {
            const mappedEvent = mappedEventsById.get(event.id) ?? mapCanonicalEventToVex(event);
            const vfNote = new StaveNote({
              clef: "treble",
              duration: mappedEvent.duration.duration,
              keys: [mappedEvent.pitch.key],
            });

            if (mappedEvent.duration.dotted) {
              Dot.buildAndAttach([vfNote], {all: true});
            }

            if (visibleLayers.accidentals && mappedEvent.pitch.accidental) {
              vfNote.addModifier(new Accidental(mappedEvent.pitch.accidental), 0);
            }

            // Policy-derived natural (ENGRAVING_POLICY bolum 3): ayni olcu +
            // ayni adimda onceki ariza sonrasi arizasiz event cancellation'dir.
            if (visibleLayers.accidentals && policyNaturals.has(event.id)) {
              vfNote.addModifier(new Accidental("n"), 0);
            }

            const komaAccidental = visibleLayers.accidentals
              ? formatKomaAccidental(mappedEvent.pitch.komaAccidental)
              : null;
            if (komaAccidental) {
              vfNote.addModifier(
                new Annotation(komaAccidental)
                  .setJustification(Annotation.HorizontalJustify.CENTER)
                  .setVerticalJustification(Annotation.VerticalJustify.TOP),
                0,
              );
            }

            return vfNote;
          });

          if (staveNotes.length === 0) continue;

          const systemBeatSpan = Math.max(1, Math.ceil(systemLayout.endBeat - systemLayout.startBeat));
          const voice = new Voice({
            beatValue: scoreMeter.beatValue,
            numBeats: Math.max(scoreMeter.beatValue === 4 ? systemBeatSpan : scoreMeter.numBeats, systemBeatSpan),
          }).setStrict(false);
          voice.addTickables(staveNotes);
          const contextReserve = systemLayout.measureIndex === 1 && systemLayout.segmentIndex === 0 ? 160 : 76;
          new Formatter().joinVoices([voice]).format([voice], Math.max(360, systemLayout.width - contextReserve));
          voice.draw(context, stave);

          const beamGroups: Array<typeof staveNotes> = [];
          let currentBeamGroup: typeof staveNotes = [];
          systemEvents.forEach((event, index) => {
            const mappedEvent = mappedEventsById.get(event.id) ?? mapCanonicalEventToVex(event);
            const baseDuration = mappedEvent.duration.duration.replace("r", "");
            const beamable = !event.isRest && (baseDuration === "8" || baseDuration === "16" || baseDuration === "32");
            if (beamable) {
              currentBeamGroup.push(staveNotes[index]);
              return;
            }
            if (currentBeamGroup.length > 1) beamGroups.push(currentBeamGroup);
            currentBeamGroup = [];
          });
          if (currentBeamGroup.length > 1) beamGroups.push(currentBeamGroup);

          for (const beamGroup of beamGroups) {
            for (const beam of Beam.generateBeams(beamGroup, {maintainStemDirections: true})) {
              beam.setContext(context).draw();
            }
          }

          systemEvents.forEach((event, index) => {
            const vfNote = staveNotes[index];
            const ys = vfNote.getYs();
            renderedPositions.push({
              id: event.id,
              labelY: staveBottom + 42,
              measureId: event.measureId,
              systemId: systemLayout.id,
              x: vfNote.getAbsoluteX(),
              y: ys[0] ?? staveTop + 40,
            });
          });
        }

        const svg = container.querySelector("svg");
        svg?.setAttribute("data-renderer", "vexflow");
        if (!cancelled) setNotePositions(renderedPositions);
      } catch (error) {
        if (!cancelled) {
          setNotePositions([]);
          setRenderError(error instanceof Error ? error.message : "VexFlow render hatası");
        }
      }
    })();

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [document, mappedEventsById, policyNaturals, surfaceHeight, surfaceWidth, systemLayouts, visibleLayers.accidentals]);

  return (
    <div className="overflow-x-auto rounded-md border border-[var(--color-border-default)] bg-white shadow-sm">
      <div
        className="relative"
        style={{
          backgroundColor: "#fffefd",
          backgroundImage: visibleLayers.grid
            ? "linear-gradient(#f0ebe4 1px, transparent 1px), linear-gradient(90deg, #f0ebe4 1px, transparent 1px)"
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
              fill="#f8eee6"
              stroke="#9a4f2e"
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
              <text key={layout.id} x={layout.x + 12} y={layout.y + STAVE_TOP_IN_SYSTEM - 24} fill="#87644b" fontSize="12">
                {getSystemLabel(layout)}
              </text>
            ))}
          {visibleLayers.measureLabels && (
            <g data-testid="score-usul-label">
              <text x={SCORE_PADDING_X + 12} y={SURFACE_HEADER_HEIGHT + STAVE_TOP_IN_SYSTEM - 46} fill="#5f2b13" fontSize="12" fontWeight="700">
                USUL: {document.usul} · {document.meter}
              </text>
            </g>
          )}
          {visibleLayers.measureLabels && (
            <g data-testid="score-key-signature-policy">
              <text x={SCORE_PADDING_X + 224} y={SURFACE_HEADER_HEIGHT + STAVE_TOP_IN_SYSTEM - 46} fill="#5f2b13" fontSize="12" fontWeight="700">
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
                  fill="#fffefd"
                  stroke="#9a4f2e"
                  strokeWidth="1.1"
                />
                <text x={marker.x + 10} y={marker.y - 1} fill="#5f2b13" fontSize="12" fontWeight="700">
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
                stroke="#2f8a45"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx={activePosition.x} cy={activePosition.y} r="19" fill="none" stroke="#2f8a45" strokeWidth="4" />
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
                fill="#fffefd"
                stroke="#2f8a45"
                strokeWidth="1.3"
              />
              <text x={activeCallout.x + 13} y={activeCallout.y + 17} fill="#2f8a45" fontSize="12" fontWeight="700">
                {formatNotationLabel(activeEvent.pitch.solfege)}
              </text>
              <text
                x={activePosition.x}
                y={activePosition.labelY}
                textAnchor="middle"
                fill="#2f8a45"
                fontSize="12"
                fontWeight="700"
              >
                {formatNotationLabel(activeEvent.pitch.solfege)}
              </text>
            </g>
          )}
          {visibleLayers.evidence && source && (
            <g>
              <rect x="54" y={surfaceHeight - EVIDENCE_BOTTOM_GAP + 6} width="326" height="20" rx="10" fill="#f8eee6" stroke="#d9c8b8" />
              <text x="68" y={surfaceHeight - EVIDENCE_BOTTOM_GAP + 20} fill="#72513b" fontSize="12">
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
                `${system.id}:${system.measureId}:${system.segmentIndex + 1}/${system.segmentCount}:${system.eventIds.length}:${
                  system.startBeat
                }-${system.endBeat}`,
            )
            .join("\n")}
        </pre>
      </div>
    </div>
  );
}
