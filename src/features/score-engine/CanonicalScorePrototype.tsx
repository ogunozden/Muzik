"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {
  getActiveCanonicalEvent,
  getCanonicalMeasure,
  getCanonicalScheduledNotes,
  type CanonicalScoreDocument,
} from "@/data/score-engine/canonical-score";
import type {CanonicalDocumentListItem, SymbtrCanonicalImportResult} from "@/data/score-engine/importer";
import {SCORE_ENGINE_DEMO_DOCUMENT} from "@/data/score-engine/demo-score";
import {evaluateCanonicalScoreQuality} from "@/data/score-engine/quality";
import {playArrangement, stopAll, type InstrumentType} from "@/engines/ses/engine";
import {ENSTRUMAN_LIST, MELODIC_INSTRUMENTS} from "@/lib/app-constants";
import {tokens} from "@/shared/tokens";
import {
  ConfidenceBar,
  ScoreSurface,
  StatusPill,
  WorkbenchMetric,
} from "./workbench/ScoreSurface";
import {WorkbenchStatusBar} from "./workbench/WorkbenchStatusBar";
import {
  DEFAULT_VISIBLE_LAYERS,
  SCORE_LAYER_CONTROLS,
  formatFrequency,
  formatKeySignaturePolicy,
  formatNotationLabel,
  formatTime,
  formatWesternPitch,
  getInstrumentLabel,
  getQualityTone,
  getValidationTone,
  type VisibleScoreLayer,
  type VisibleScoreLayers,
} from "./workbench/score-format";

export function CanonicalScorePrototype({
  document: initialDocument = SCORE_ENGINE_DEMO_DOCUMENT,
}: {
  document?: CanonicalScoreDocument;
}) {
  const {t} = useTranslation();
  const [document, setDocument] = useState(initialDocument);
  const [availableDocuments, setAvailableDocuments] = useState<CanonicalDocumentListItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(initialDocument.id);
  const [documentLoadState, setDocumentLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [documentLoadError, setDocumentLoadError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>("ud");
  const [visibleLayers, setVisibleLayers] = useState<VisibleScoreLayers>(DEFAULT_VISIBLE_LAYERS);
  const autoLoadedInitialDocumentRef = useRef(false);
  const progressTimerRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const activeEvent = getActiveCanonicalEvent(document, playbackPosition) ?? document.events[0] ?? null;
  const activeMeasure = getCanonicalMeasure(document, activeEvent?.measureId);
  const activeEventIndex = activeEvent ? document.events.findIndex((event) => event.id === activeEvent.id) + 1 : 0;
  const activeProgress = Math.min(100, Math.max(0, (playbackPosition / Math.max(document.totalDuration, 0.1)) * 100));
  const activeSource = activeEvent ? document.sources.find((source) => source.id === activeEvent.evidenceId) : null;
  const melodicInstrumentOptions = useMemo(
    () => ENSTRUMAN_LIST.filter((instrument) => (MELODIC_INSTRUMENTS as readonly string[]).includes(instrument.id)),
    [],
  );
  const scheduledNotes = useMemo(
    () => getCanonicalScheduledNotes(document, selectedInstrument),
    [document, selectedInstrument],
  );
  const qualityReport = useMemo(() => evaluateCanonicalScoreQuality(document), [document]);

  const loadCanonicalDocument = useCallback(async (documentId: string) => {
    setDocumentLoadState("loading");
    setDocumentLoadError(null);
    try {
      const response = await fetch(`/api/score-engine/documents/${encodeURIComponent(documentId)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as SymbtrCanonicalImportResult;
      setDocument(result.document);
      setSelectedDocumentId(result.document.id);
      setPlaybackPosition(0);
      setDocumentLoadState("loaded");
    } catch (error) {
      setDocumentLoadState("error");
      setDocumentLoadError(error instanceof Error ? error.message : "Doküman yüklenemedi");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/score-engine/documents");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as {documents: CanonicalDocumentListItem[]};
        if (cancelled) return;
        setAvailableDocuments(payload.documents);
        const firstReachable = payload.documents.find((item) => item.eventCount > 0 && item.validation.ok);
        if (!autoLoadedInitialDocumentRef.current && firstReachable && selectedDocumentId === initialDocument.id) {
          autoLoadedInitialDocumentRef.current = true;
          await loadCanonicalDocument(firstReachable.id);
        }
      } catch (error) {
        if (!cancelled) {
          setDocumentLoadState("error");
          setDocumentLoadError(error instanceof Error ? error.message : "Doküman listesi yüklenemedi");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialDocument.id, loadCanonicalDocument, selectedDocumentId]);

  const toggleScoreLayer = useCallback((layer: VisibleScoreLayer) => {
    setVisibleLayers((current) => ({...current, [layer]: !current[layer]}));
  }, []);

  const clearPlaybackResources = useCallback(() => {
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    stopAll();
    progressTimerRef.current = null;
    stopTimerRef.current = null;
  }, []);

  const stopPlayback = useCallback(() => {
    clearPlaybackResources();
    setIsPlaying(false);
    setPlaybackPosition(0);
  }, [clearPlaybackResources]);

  useEffect(() => clearPlaybackResources, [clearPlaybackResources]);

  const playScore = useCallback(() => {
    if (isPlaying || scheduledNotes.length === 0) return;

    stopAll();
    setIsPlaying(true);
    setPlaybackPosition(0);

    const duration = document.totalDuration;
    const startAt = performance.now();

    progressTimerRef.current = window.setInterval(() => {
      setPlaybackPosition(Math.min((performance.now() - startAt) / 1000, duration));
    }, 80);
    stopTimerRef.current = window.setTimeout(stopPlayback, (duration + 0.35) * 1000);
    void playArrangement(scheduledNotes, [], selectedInstrument);
  }, [document.totalDuration, isPlaying, scheduledNotes, selectedInstrument, stopPlayback]);

  return (
    <div className={`mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 ${tokens.colors.background.base}`}>
      <div className="rounded-md border border-[var(--color-border-default)] bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>{t("scoreEngine.eyebrow")}</p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-primary-700)]">{t("scoreEngine.title")}</h1>
            <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm ${tokens.colors.text.secondary}`}>
              <span className="font-semibold text-[var(--color-text-primary)]">{document.title}</span>
              <span>{document.composer}</span>
              <span>{document.makam}</span>
              <span>{document.usul}</span>
              <span>{document.meter}</span>
              <span>{document.ahenkLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              label={document.validationIssues.length === 0 ? "validator-pass" : "validator-review"}
              tone={getValidationTone(document)}
            />
            <StatusPill label="ID sync" />
            <StatusPill label={`quality-${qualityReport.status}`} tone={getQualityTone(qualityReport)} />
            <StatusPill label={activeSource?.kind ?? "source"} tone="neutral" />
            <select
              aria-label={t("scoreEngine.document")}
              value={selectedDocumentId}
              onChange={(event) => void loadCanonicalDocument(event.target.value)}
              className="h-10 min-w-[220px] rounded-md border border-[var(--color-border-default)] bg-white px-3 text-sm"
            >
              <option value={initialDocument.id}>{initialDocument.title} · {t("scoreEngine.demoFallback")}</option>
              {availableDocuments.map((item) => (
                <option key={item.id} value={item.id} disabled={item.eventCount === 0}>
                  {item.title} · {item.eventCount || "kaynak yok"} event
                </option>
              ))}
            </select>
            <select
              aria-label={t("scoreEngine.instrument")}
              value={selectedInstrument}
              onChange={(event) => setSelectedInstrument(event.target.value as InstrumentType)}
              className="h-10 rounded-md border border-[var(--color-border-default)] bg-white px-3 text-sm"
            >
              {melodicInstrumentOptions.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>
                  {instrument.nameTr}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={isPlaying ? stopPlayback : playScore}
              className="h-10 rounded-md bg-[var(--color-primary-500)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-600)]"
            >
              {isPlaying ? t("scoreEngine.stop") : t("scoreEngine.play")}
            </button>
          </div>
        </div>

        {documentLoadState === "error" && documentLoadError && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Canonical kaynak yükleme hatası: {documentLoadError}. Demo fallback ekranda kalır.
          </div>
        )}

        <div className="mt-4 grid gap-2 md:grid-cols-5">
          {[
            [t("scoreEngine.metricSource"), activeSource?.label ?? "SymbTr source"],
            [t("scoreEngine.metricCanonical"), `${document.events.length} event / ${document.measures.length} ölçü`],
            [t("scoreEngine.metricRender"), documentLoadState === "loading" ? "yükleniyor" : "temiz yüzey"],
            [t("scoreEngine.metricPlayback"), `${scheduledNotes.length} nota / ${getInstrumentLabel(selectedInstrument)}`],
            [t("scoreEngine.metricQuality"), `${qualityReport.score}/100 · ${qualityReport.status}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2">
              <p className={`text-[11px] font-semibold uppercase ${tokens.colors.text.secondary}`}>{label}</p>
              <p className="mt-1 truncate text-sm font-semibold text-[var(--color-text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <section className="min-w-0">
          <div className="mb-3 flex flex-col gap-3 rounded-md border border-[var(--color-border-default)] bg-white p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>{t("scoreEngine.layers")}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">{t("scoreEngine.canonicalSurface")}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-5">
              {SCORE_LAYER_CONTROLS.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  aria-pressed={visibleLayers[layer.id]}
                  onClick={() => toggleScoreLayer(layer.id)}
                  className={`rounded-md border px-3 py-2 text-left text-xs ${
                    visibleLayers[layer.id]
                      ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                      : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)]"
                  }`}
                >
                  <span className="block font-semibold">{layer.label}</span>
                  <span className="block">{layer.value}</span>
                </button>
              ))}
            </div>
            <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm">
              <p className={`text-[11px] font-semibold uppercase ${tokens.colors.text.secondary}`}>{t("scoreEngine.active")}</p>
              <p className="mt-1 font-semibold text-[var(--color-primary-700)]">
                {formatNotationLabel(activeEvent?.pitch.solfege ?? null)} · {activeEventIndex || "-"}
                /{document.events.length} · {activeMeasure ? `${activeMeasure.index}. ölçü` : "-"}
              </p>
            </div>
          </div>

          <ScoreSurface document={document} activeEvent={activeEvent} visibleLayers={visibleLayers} />

          <div className="mt-3 rounded-md border border-[var(--color-border-subtle)] bg-white p-3">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
              <div className="h-full rounded-full bg-[var(--color-primary-500)]" style={{width: `${activeProgress}%`}} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <WorkbenchMetric label="Clock" value={`${formatTime(playbackPosition)} / ${formatTime(document.totalDuration)}`} />
              <WorkbenchMetric label="Aktif ölçü" value={activeMeasure ? `${activeMeasure.index}. ölçü` : "-"} />
              <WorkbenchMetric label="Aktif event" value={activeEventIndex ? `${activeEventIndex}/${document.events.length}` : "-"} />
              <WorkbenchMetric label="Render" value="Canonical" />
            </div>
          </div>
        </section>

        <aside className="grid content-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          <section className="rounded-md border border-[var(--color-border-default)] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>{t("scoreEngine.activeNote")}</p>
                <h2 className="mt-1 text-3xl font-bold text-[var(--color-primary-700)]">
                  {formatNotationLabel(activeEvent?.pitch.solfege ?? null)}
                </h2>
              </div>
              <StatusPill label={activeEvent?.verificationState ?? "candidate"} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className={tokens.colors.text.secondary}>{t("scoreEngine.westernNote")}</p>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {formatWesternPitch(activeEvent?.pitch.playback ?? null)}
                </p>
              </div>
              <div>
                <p className={tokens.colors.text.secondary}>{t("scoreEngine.duration")}</p>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {activeEvent?.durationBeats.toFixed(activeEvent.durationBeats % 1 === 0 ? 0 : 2) ?? "-"} vuruş
                </p>
              </div>
              <div>
                <p className={tokens.colors.text.secondary}>Koma53</p>
                <p className="font-semibold text-[var(--color-text-primary)]">{activeEvent?.pitch.koma53 ?? "-"}</p>
              </div>
              <div>
                <p className={tokens.colors.text.secondary}>{t("scoreEngine.frequency")}</p>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {formatFrequency(activeEvent?.pitch.frequency ?? null)}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-3">
              <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Note ID</p>
              <p className="mt-1 break-all text-xs font-semibold text-[var(--color-primary-700)]">
                {activeEvent?.id ?? "-"}
              </p>
            </div>
          </section>

          <section className="rounded-md border border-[var(--color-border-default)] bg-white p-4 shadow-sm">
            <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>{t("scoreEngine.instrument")}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">
              {getInstrumentLabel(selectedInstrument)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {melodicInstrumentOptions.slice(0, 8).map((instrument) => (
                <button
                  key={instrument.id}
                  type="button"
                  onClick={() => setSelectedInstrument(instrument.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    instrument.id === selectedInstrument
                      ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                      : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  {instrument.nameTr}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-[var(--color-border-default)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>{t("scoreEngine.evidence")}</p>
              <StatusPill label={activeSource?.kind ?? "symbtr"} tone="neutral" />
            </div>
            <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
              {activeSource?.label ?? "SymbTr symbolic source"}
            </p>
            <p className={`mt-1 break-all text-xs ${tokens.colors.text.secondary}`}>
              {activeSource?.reference ?? "-"}
            </p>
            <div className="mt-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-2 text-xs">
              <p className={`font-semibold uppercase ${tokens.colors.text.secondary}`}>Kaynak key policy</p>
              <p className="mt-1 text-[var(--color-text-primary)]">{formatKeySignaturePolicy(document)}</p>
              <p className={`mt-1 ${tokens.colors.text.secondary}`}>
                {document.notationPolicy.keySignature.status} · {document.notationPolicy.keySignature.source}
              </p>
            </div>
            {activeSource && (
              <div className="mt-4 grid gap-3">
                <ConfidenceBar label="source" value={activeSource.confidence.source} />
                <ConfidenceBar label="pitch" value={activeSource.confidence.pitch} />
                <ConfidenceBar label="duration" value={activeSource.confidence.duration} />
                <ConfidenceBar label="musicology" value={activeSource.confidence.musicology} />
              </div>
            )}
          </section>

          <section className="rounded-md border border-[var(--color-border-default)] bg-white p-4 shadow-sm">
            <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>{t("scoreEngine.validationAndCorrection")}</p>
            <div className="mt-3 grid gap-2 text-sm text-[var(--color-text-primary)]">
              {qualityReport.metrics.map((metric) => (
                <div key={metric.id} className="flex items-center justify-between gap-2">
                  <span>{metric.label}</span>
                  <StatusPill
                    label={metric.value}
                    tone={metric.status === "pass" ? "success" : metric.status === "fail" ? "warning" : "neutral"}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 max-h-24 overflow-auto rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-2 text-xs">
              {qualityReport.metrics.map((metric) => (
                <p key={metric.id} className="mb-1 text-[var(--color-text-secondary)]">
                  {metric.status}: {metric.detail}
                </p>
              ))}
            </div>
            {document.validationIssues.length > 0 && (
              <div className="mt-3 max-h-28 overflow-auto rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-2 text-xs">
                {document.validationIssues.slice(0, 6).map((issue) => (
                  <p key={issue.id} className="mb-1 text-[var(--color-text-secondary)]">
                    {issue.severity}: {issue.code}
                  </p>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <WorkbenchStatusBar
        validatorOk={document.validationIssues.length === 0}
        qualityStatus={qualityReport.status}
        qualityScore={qualityReport.score}
        activeMeasureLabel={activeMeasure ? `${activeMeasure.index}. ölçü` : "-"}
        activeEventIndex={activeEventIndex}
        totalEvents={document.events.length}
      />
    </div>
  );
}
