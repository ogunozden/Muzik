"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {
  computePolicyDerivedNaturals,
  computeSourceProvenTies,
  findSegnoSectionMarker,
  mapCanonicalEventToVex,
} from "@/data/score-engine/notation";
import type {CanonicalScoreDocument, CanonicalScoreEvent} from "@/data/score-engine/canonical-score";
import {SCORE_SURFACE_COLORS} from "@/shared/tokens/visual-palettes";
import {findRenderSystemForEvent} from "@/features/score-engine/score-layout";
import {
  EVIDENCE_BOTTOM_GAP,
  STAVE_HEIGHT,
  STAVE_TOP_IN_SYSTEM,
  SURFACE_HEADER_HEIGHT,
  SYSTEM_HEIGHT,
  buildGlyphClassMapText,
  formatKomaAccidental,
  getSurfaceHeight,
  getSurfaceWidth,
  getSystemLayouts,
  komaAccidentalGlyphName,
  parseMeter,
  type NoteRenderPosition,
  type VisibleScoreLayers,
} from "@/features/score-engine/workbench/score-format";
import {
  SYSTEMS_PER_FRAME,
  VIRTUALIZATION_MIN_SYSTEMS,
  buildSectionMarkerPositions,
  computeRenderWindow,
  getActiveCallout,
  nextFrame,
} from "@/features/score-engine/workbench/score-helpers";

export function useScoreSurface({
  document,
  activeEvent,
  visibleLayers,
}: {
  document: CanonicalScoreDocument;
  activeEvent: CanonicalScoreEvent | null;
  visibleLayers: VisibleScoreLayers;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollHostRef = useRef<HTMLDivElement>(null);
  const source = document.sources[0];
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const surfaceWidth = useMemo(() => Math.max(getSurfaceWidth(), measuredWidth), [measuredWidth]);

  useEffect(() => {
    const measure = () => {
      const host = scrollHostRef.current;
      if (host) setMeasuredWidth(host.clientWidth);
    };
    const initial = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(initial);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const systemLayouts = useMemo(() => getSystemLayouts(document, surfaceWidth), [document, surfaceWidth]);
  const surfaceHeight = useMemo(() => getSurfaceHeight(systemLayouts.length), [systemLayouts.length]);
  const mappedEvents = useMemo(() => document.events.map(mapCanonicalEventToVex), [document]);
  const mappedEventsById = useMemo(
    () => new Map(mappedEvents.map((mappedEvent) => [mappedEvent.event.id, mappedEvent])),
    [mappedEvents],
  );
  const sourceTies = useMemo(() => computeSourceProvenTies(document), [document]);
  const notationMapText = useMemo(
    () =>
      [
        ...mappedEvents.map(
          (mappedEvent) =>
            `${mappedEvent.event.id}:${mappedEvent.pitch.key}:${mappedEvent.duration.duration}:${
              mappedEvent.duration.dotted ? "dotted" : "plain"
            }:${mappedEvent.pitch.komaAccidental ?? "none"}`,
        ),
        ...sourceTies.map((tie) => `feature:tie:${tie.fromEventId}:${tie.toEventId}:source-proven`),
      ].join("\n"),
    [mappedEvents, sourceTies],
  );
  const glyphClassMapText = useMemo(() => buildGlyphClassMapText(document), [document]);
  const policyNaturals = useMemo(() => computePolicyDerivedNaturals(document.events), [document]);
  const [notePositions, setNotePositions] = useState<NoteRenderPosition[]>([]);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderRange, setRenderRange] = useState<{start: number; end: number}>({
    start: 0,
    end: Number.MAX_SAFE_INTEGER,
  });

  useEffect(() => {
    if (systemLayouts.length < VIRTUALIZATION_MIN_SYSTEMS) return;
    const update = () => {
      const host = scrollHostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const top = Math.max(0, -rect.top);
      const bottom = top + window.innerHeight;
      const next = computeRenderWindow(top, bottom, systemLayouts.length);
      setRenderRange((current) => (current.start === next.start && current.end === next.end ? current : next));
    };
    const initial = requestAnimationFrame(update);
    window.addEventListener("scroll", update, {passive: true});
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(initial);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [systemLayouts.length]);

  const activeSystem = findRenderSystemForEvent(systemLayouts, activeEvent?.id);
  const activeSystemLayout = activeSystem
    ? (systemLayouts.find((layout) => layout.id === activeSystem.id) ?? null)
    : null;
  const activePosition = activeEvent ? (notePositions.find((position) => position.id === activeEvent.id) ?? null) : null;
  const activeCallout = getActiveCallout(activePosition, activeSystemLayout);
  const sectionMarkerPositions = useMemo(
    () => buildSectionMarkerPositions(document, notePositions, systemLayouts),
    [document, notePositions, systemLayouts],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    container.innerHTML = "";
    setRenderError(null);
    void (async () => {
      try {
        const vexflow = await import("vexflow");
        const {Accidental, Annotation, Beam, Dot, Formatter, Renderer, Stave, StaveNote, StaveTie, Tuplet, Voice} = vexflow;
        const GLYPHS =
          (vexflow as unknown as {Glyphs?: Record<string, string>}).Glyphs ??
          ((vexflow as unknown as {default?: {Glyphs?: Record<string, string>}}).default?.Glyphs ?? {});
        if (cancelled) return;
        const renderer = new Renderer(container, Renderer.Backends.SVG);
        renderer.resize(surfaceWidth, surfaceHeight);
        const context = renderer.getContext();
        context.setFont("Arial", 10);
        const renderedPositions: NoteRenderPosition[] = [];
        const scoreMeter = parseMeter(document.meter);
        const eventsById = new Map(document.events.map((event) => [event.id, event]));
        const vfNotesByEventId = new Map<
          string,
          {note: InstanceType<typeof StaveNote>; lastNote: InstanceType<typeof StaveNote>; systemId: string}
        >();
        const drawnLayouts = systemLayouts.slice(renderRange.start, renderRange.end);
        for (let chunkStart = 0; chunkStart < drawnLayouts.length; chunkStart += SYSTEMS_PER_FRAME) {
          if (cancelled) return;
          if (chunkStart > 0) await nextFrame();
          if (cancelled) return;
          for (const systemLayout of drawnLayouts.slice(chunkStart, chunkStart + SYSTEMS_PER_FRAME)) {
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
            const notesByEvent = systemEvents.map((event) => {
              const mappedEvent = mappedEventsById.get(event.id) ?? mapCanonicalEventToVex(event);
              const parts = mappedEvent.duration.tiedParts ?? [
                {duration: mappedEvent.duration.duration, dotted: mappedEvent.duration.dotted},
              ];
              const notes = parts.map((part, partIndex) => {
                const vfNote = new StaveNote({
                  clef: "treble",
                  duration: part.duration,
                  keys: [mappedEvent.pitch.key],
                });
                if (part.dotted) Dot.buildAndAttach([vfNote], {all: true});
                if (partIndex > 0) return vfNote;
                const komaGlyphName = visibleLayers.accidentals
                  ? komaAccidentalGlyphName(mappedEvent.pitch.komaAccidental)
                  : null;
                const komaGlyph = komaGlyphName ? GLYPHS[komaGlyphName] : null;
                if (komaGlyph) {
                  const isFlat = mappedEvent.pitch.komaAccidental?.startsWith("b") ?? false;
                  const komaAcc = new Accidental(isFlat ? "b" : "#");
                  komaAcc.setText(komaGlyph);
                  vfNote.addModifier(komaAcc, 0);
                } else if (visibleLayers.accidentals && mappedEvent.pitch.accidental) {
                  vfNote.addModifier(new Accidental(mappedEvent.pitch.accidental), 0);
                }
                if (visibleLayers.accidentals && policyNaturals.has(event.id)) {
                  vfNote.addModifier(new Accidental("n"), 0);
                }
                const komaAnnotationText =
                  visibleLayers.accidentals && !komaGlyph
                    ? formatKomaAccidental(mappedEvent.pitch.komaAccidental)
                    : null;
                if (komaAnnotationText) {
                  vfNote.addModifier(
                    new Annotation(komaAnnotationText)
                      .setJustification(Annotation.HorizontalJustify.CENTER)
                      .setVerticalJustification(Annotation.VerticalJustify.TOP),
                    0,
                  );
                }
                return vfNote;
              });
              return {event, mappedEvent, notes};
            });
            const staveNotes = notesByEvent.flatMap((entry) => entry.notes);
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
            for (const entry of notesByEvent) {
              const baseDuration = entry.mappedEvent.duration.duration.replace("r", "");
              const beamable =
                !entry.event.isRest &&
                !entry.mappedEvent.duration.tiedParts &&
                (baseDuration === "8" || baseDuration === "16" || baseDuration === "32");
              if (beamable) {
                currentBeamGroup.push(...entry.notes);
                continue;
              }
              if (currentBeamGroup.length > 1) beamGroups.push(currentBeamGroup);
              currentBeamGroup = [];
            }
            if (currentBeamGroup.length > 1) beamGroups.push(currentBeamGroup);
            for (const beamGroup of beamGroups) {
              for (const beam of Beam.generateBeams(beamGroup, {maintainStemDirections: true})) {
                beam.setContext(context).draw();
              }
            }
            let tupletRun: Array<InstanceType<typeof StaveNote>> = [];
            let tupletDenominator: number | null = null;
            const flushTupletRun = () => {
              const batch = tupletRun;
              tupletRun = [];
              if (!tupletDenominator || batch.length === 0) return;
              const groupSize = 3;
              for (let at = 0; at + groupSize <= batch.length; at += groupSize) {
                new Tuplet(batch.slice(at, at + groupSize), {numNotes: groupSize, notesOccupied: 2})
                  .setContext(context)
                  .draw();
              }
            };
            for (const entry of notesByEvent) {
              const denominator = entry.mappedEvent.duration.tuplet?.sourceDenominator ?? null;
              if (denominator !== tupletDenominator) {
                flushTupletRun();
                tupletDenominator = denominator;
              }
              if (denominator) tupletRun.push(...entry.notes);
            }
            flushTupletRun();
            for (const entry of notesByEvent) {
              const firstNote = entry.notes[0];
              const lastNote = entry.notes[entry.notes.length - 1];
              vfNotesByEventId.set(entry.event.id, {note: firstNote, lastNote, systemId: systemLayout.id});
              for (let at = 0; at + 1 < entry.notes.length; at += 1) {
                new StaveTie({firstNote: entry.notes[at], lastNote: entry.notes[at + 1]}).setContext(context).draw();
              }
              const ys = firstNote.getYs();
              renderedPositions.push({
                id: entry.event.id,
                labelY: staveBottom + 42,
                measureId: entry.event.measureId,
                systemId: systemLayout.id,
                x: firstNote.getAbsoluteX(),
                y: ys[0] ?? staveTop + 40,
              });
            }
          }
        }
        for (const tie of sourceTies) {
          const fromEntry = vfNotesByEventId.get(tie.fromEventId);
          const toEntry = vfNotesByEventId.get(tie.toEventId);
          if (!fromEntry || !toEntry) continue;
          if (fromEntry.systemId === toEntry.systemId) {
            new StaveTie({firstNote: fromEntry.lastNote, lastNote: toEntry.note}).setContext(context).draw();
            continue;
          }
          new StaveTie({firstNote: fromEntry.lastNote}).setContext(context).draw();
          new StaveTie({lastNote: toEntry.note}).setContext(context).draw();
        }
        const segnoMarker = findSegnoSectionMarker(document);
        const segnoGlyph = segnoMarker ? GLYPHS.segno : null;
        if (segnoMarker && segnoGlyph) {
          const segnoSystem = systemLayouts.find((layout) => layout.eventIds.includes(segnoMarker.eventId));
          if (segnoSystem) {
            context.save();
            context.setFillStyle(SCORE_SURFACE_COLORS.segnoInk);
            context.setFont("Arial", 14);
            context.fillText(segnoGlyph, segnoSystem.x - 12, segnoSystem.y + STAVE_TOP_IN_SYSTEM - 6);
            context.restore();
          }
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
  }, [
    document,
    mappedEventsById,
    policyNaturals,
    renderRange,
    sourceTies,
    surfaceHeight,
    surfaceWidth,
    systemLayouts,
    visibleLayers.accidentals,
  ]);

  return {
    activeCallout,
    activePosition,
    activeSystemLayout,
    containerRef,
    glyphClassMapText,
    notationMapText,
    notePositions,
    renderError,
    scrollHostRef,
    sectionMarkerPositions,
    source,
    surfaceHeight,
    surfaceWidth,
    systemLayouts,
  };
}
