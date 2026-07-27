"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {
  computePolicyDerivedNaturals,
  computeSourceProvenTies,
  findSegnoSectionMarker,
  mapCanonicalEventToVex,
} from "@/data/score-engine/notation";
import type {CanonicalScoreDocument, CanonicalScoreEvent} from "@/data/score-engine/canonical-score";
import {tokens} from "@/shared/tokens";
import {findRenderSystemForEvent} from "../score-layout";
import {
  EVIDENCE_BOTTOM_GAP,
  SCORE_PADDING_X,
  STAVE_HEIGHT,
  STAVE_TOP_IN_SYSTEM,
  SURFACE_HEADER_HEIGHT,
  SYSTEM_HEIGHT,
  buildGlyphClassMapText,
  formatKeySignaturePolicy,
  formatKomaAccidental,
  komaAccidentalGlyphName,
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

/** Bir frame'de cizilecek sistem sayisi (D12). */
const SYSTEMS_PER_FRAME = 8;

/**
 * Bu sayidan AZ sistemi olan belgeler tamamen cizilir — sanallastirma yok (K5).
 * Olcum (120 gercek eser): medyan 55 sistem / 11.708px, en buyugu 193 sistem /
 * 40.688px. Kucuk belgelerde pencereleme kazanc getirmez, yalnizca davranisi
 * degistirir; esik altinda eski (tam) yol korunur.
 */
const VIRTUALIZATION_MIN_SYSTEMS = 24;
/** Viewport disinda, ustte ve altta hazir tutulan sistem sayisi. */
const RENDER_OVERSCAN_SYSTEMS = 6;

/**
 * Bir sonraki frame'i bekler. `requestAnimationFrame` yoksa (jsdom/SSR) hemen
 * cozulur — cizim yine tamamlanir, yalnizca bolunmez.
 */
function nextFrame(): Promise<void> {
  if (typeof requestAnimationFrame !== "function") return Promise.resolve();
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

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
  const scrollHostRef = useRef<HTMLDivElement>(null);
  const source = document.sources[0];
  /**
   * Yuzey genisligi (K5). `getSurfaceWidth()` TABAN degeri verir (1180);
   * kapsayici daha genisse yuzey ONA buyur — daralmaz, cunku porte icin bir
   * asgari genislik gerekir ve dar ekranda zaten yatay kaydirma var. Eskiden
   * deger sabitti ve genis ekranlarda sagda bos alan kaliyordu.
   */
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
        // Kaynak-kanitli tie satirlari (F8.7): audit `:tie:` token'ini bu
        // haritadan dogrular; yalniz dogrulanmis (cizilen) ciftler yazilir.
        ...sourceTies.map((tie) => `feature:tie:${tie.fromEventId}:${tie.toEventId}:source-proven`),
      ].join("\n"),
    [mappedEvents, sourceTies],
  );
  const glyphClassMapText = useMemo(() => buildGlyphClassMapText(document), [document]);
  const policyNaturals = useMemo(() => computePolicyDerivedNaturals(document.events), [document]);
  const [notePositions, setNotePositions] = useState<NoteRenderPosition[]>([]);
  const [renderError, setRenderError] = useState<string | null>(null);
  /**
   * Cizilecek sistem araligi (K5). Buyuk belgelerde tum porteleri DOM'a koymak
   * yerine yalnizca viewport civarindakiler cizilir; SVG yuksekligi degismez,
   * bu yuzden kaydirma cubugu ve konumlar bozulmaz.
   */
  const [renderRange, setRenderRange] = useState<{start: number; end: number}>({start: 0, end: Number.MAX_SAFE_INTEGER});

  useEffect(() => {
    // Esik altinda sanallastirma yok: varsayilan aralik zaten "hepsi".
    if (systemLayouts.length < VIRTUALIZATION_MIN_SYSTEMS) return;

    const update = () => {
      const host = scrollHostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      // Yuzeyin ustunden viewport'a olan mesafe (yuzey koordinatinda).
      const top = Math.max(0, -rect.top);
      const bottom = top + window.innerHeight;
      const first = Math.floor((top - SURFACE_HEADER_HEIGHT) / SYSTEM_HEIGHT) - RENDER_OVERSCAN_SYSTEMS;
      const last = Math.ceil((bottom - SURFACE_HEADER_HEIGHT) / SYSTEM_HEIGHT) + RENDER_OVERSCAN_SYSTEMS;
      setRenderRange((current) => {
        const next = {start: Math.max(0, first), end: Math.min(systemLayouts.length, Math.max(0, last))};
        return current.start === next.start && current.end === next.end ? current : next;
      });
    };

    // Ilk olcum bir frame ERTELENIR: effect govdesinde senkron setState
    // cagirmak React Compiler'da zincirleme render uyarisi uretir.
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
        const vexflow = await import("vexflow");
        const {Accidental, Annotation, Beam, Dot, Formatter, Renderer, Stave, StaveNote, StaveTie, Tuplet, Voice} =
          vexflow;
        // `Glyphs` enum'u VexFlow'un CJS derlemesinde var ama TARAYICI
        // paketinde modul ad-alaninin tepesinde GORUNMUYOR — bu yuzden
        // `GLYPHS[...]` erisimi `Cannot read properties of undefined` ile
        // patliyor ve TUM porte cizimi cokuyordu (yalniz anahtar + mertebe
        // kaliyordu). Hata `audit:score-engine-engraving` denetimi C1
        // blokaji yuzunden hic kosamadigi icin gorunmemisti.
        //
        // Bos nesneye dusuyoruz: glyph bulunamayinca kod zaten BELGELENMIS
        // yedege gecer (standart # / b + metin annotation).
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

        // Sistemler PARCALI cizilir (D12). Olcum (120 gercek eser): medyan 55
        // sistem = 11.708px SVG, en buyugu 193 sistem = 40.688px. Hepsi tek
        // senkron dongude cizilince (her biri kendi `Formatter().format()`
        // pasiyla) ana thread bloke oluyor ve `accidentals` toggle'i tum yapiyi
        // bastan kuruyordu. Cizim BOLUNMEZ (kesme/kirpma yok) — yalniz her
        // parcadan sonra bir frame'e yer aciyoruz.
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
          // Bir event BIRDEN FAZLA notaya bolunebilir (K3): tek standart
          // degerle yazilamayan sureler (5/8, 7/8, 5/4...) bag ile bagli
          // parcalara ayrilir. Ariza/annotation YALNIZ ilk parcaya konur —
          // bagli nota arizayi tekrar etmez.
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

            if (part.dotted) {
              Dot.buildAndAttach([vfNote], {all: true});
            }

            if (partIndex > 0) return vfNote;

            // Otantik koma arizasi (F13.3): kaynak SymbTr koma tasiyorsa,
            // standart # / b YERINE gercek AEU glyph'i cizilir (bakiye, kucuk/
            // buyuk mucenneb, koma). VexFlow Glyphs enum'unda kod-alias'i
            // olmayanlar da setText ile kesin codepoint'ten cizilir. Standart-
            // disi koma (glyph yok) eski metin annotation'a duser.
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

            // Policy-derived natural (ENGRAVING_POLICY bolum 3): ayni olcu +
            // ayni adimda onceki ariza sonrasi arizasiz event cancellation'dir.
            if (visibleLayers.accidentals && policyNaturals.has(event.id)) {
              vfNote.addModifier(new Accidental("n"), 0);
            }

            // Glyph yoksa (standart-disi koma) metin annotation fallback.
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
              !entry.mappedEvent.duration.tiedParts && // bagli parcalar ayri kuyruk tasir
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

          // Tuplet bracket'leri (K2): ardisik AYNI paydali triole notalari
          // gruplanip 3:2 bracket'iyla cizilir. Yazili deger zaten sekizlik/
          // onaltilik olarak esleniyor (mapEventDurationToVex); bracket gercek
          // sureyi anlatir. Eskiden bu notalar en yakin dyadic degere
          // yuvarlanip bracket'siz ciziliyordu (2.173 event, 83 eser).
          let tupletRun: Array<InstanceType<typeof StaveNote>> = [];
          let tupletDenominator: number | null = null;
          const flushTupletRun = () => {
            const context7 = tupletRun;
            tupletRun = [];
            if (!tupletDenominator || context7.length === 0) return;
            const groupSize = 3;
            for (let at = 0; at + groupSize <= context7.length; at += groupSize) {
              new Tuplet(context7.slice(at, at + groupSize), {numNotes: groupSize, notesOccupied: 2})
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

            // Event ICI baglar (K3): bolunmus parcalari birbirine bagla.
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

        // Kaynak-kanitli tie'lar (F8.7; SymbTr v3 <tied> + mu2 caret):
        // yalniz `computeSourceProvenTies` dogrulamasindan gecen ciftler
        // cizilir. Sistem siniri asan tie iki yarim yay olarak cizilir
        // (VexFlow kismi StaveTie sozlesmesi).
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

        // Segno glyph: Teslim bolumu baslangici (SymbTr v3 PDF kaynakli).
        // Isaretci, dispatch tablosuyla ORTAK olan `findSegnoSectionMarker`tan
        // gelir (D2) — cizim ile manifest artik ayrisamaz. `GLYPHS` yukarida
        // zaten cozuldu; buradaki ikinci `await import("vexflow")` gereksizdi.
        const segnoMarker = findSegnoSectionMarker(document);
        const segnoGlyph = segnoMarker ? GLYPHS.segno : null;
        if (segnoMarker && segnoGlyph) {
          const segnoSystem = systemLayouts.find((layout) => layout.eventIds.includes(segnoMarker.eventId));
          if (segnoSystem) {
            context.save();
            context.setFillStyle("#1e40af");
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

  return (
    <div
      ref={scrollHostRef}
      className="overflow-x-auto rounded-md border border-[var(--color-border-default)] bg-white shadow-sm"
    >
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
