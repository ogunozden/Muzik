"use client";

import { useCallback, useRef, useEffect, memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { UnifiedLayout } from "@/shared/ui/layout/UnifiedLayout";
import { StudioTabs } from "@/features/studio/StudioTabs";
import dynamic from "next/dynamic";
import { useMidiInput } from "@/hooks/useMidiInput";
import { MAKAM_DATA, snapMidiToMakamFrequency } from "@/engines/makam/data";
import { USUL_DATA } from "@/engines/usul/data";
import { midiToNoteName, noteNameToMidi } from "@/engines/nota/data";
import { playSequence, stopAll } from "@/engines/ses/engine";
import type { InstrumentType } from "@/engines/ses/engine";
import { ENSTRUMAN_LIST, MELODIC_INSTRUMENTS } from "@/lib/app-constants";
import { NotaEvent } from "@/types";
import { Badge, Button, Card, CardBody, Input, Select } from "@/shared/ui";
import { tokens } from "@/shared/tokens";
import { useEditorStore } from "@/store/editorStore";

// Dynamic imports for heavy components
const InstrumentSurface = dynamic(
  () => import("@/shared/ui/organisms/InstrumentSurface").then((mod) => mod.InstrumentSurface),
  {
    loading: () => <InstrumentSurfaceSkeleton />,
    ssr: false,
  }
);

const PianoRollViewer = dynamic(
  () => import("@/shared/ui/organisms/PianoRollViewer").then((mod) => mod.PianoRollViewer),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false,
  }
);

const VexFlowViewer = dynamic(
  () => import("@/shared/ui/organisms/VexFlowViewer").then((mod) => mod.VexFlowViewer),
  {
    loading: () => <div className="animate-pulse bg-gray-100 h-48 rounded-lg" />,
    ssr: false,
  }
);

// Seyir (ezgi yonu) etiketleri — otoriter kaynak degeri -> Turkce gosterim.
const SEYIR_LABELS: Record<string, string> = {
  cikici: "Çıkıcı",
  inici: "İnici",
  "cikici-inici": "Çıkıcı-inici",
};

// Instrument surface loading skeleton
function InstrumentSurfaceSkeleton() {
  return (
    <div className="flex min-h-72 items-end justify-center gap-2 overflow-x-auto rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-5">
      {Array.from({ length: 21 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-md bg-[var(--color-primary-100)]"
          style={{ width: 34, height: `${70 + (i % 5) * 18}px` }}
        />
      ))}
    </div>
  );
}

function NotaEditorPage() {
  const { t, i18n } = useTranslation();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Zustand State
  const {
    recordedNotes,
    activeNotes,
    selectedMakamId,
    selectedUsulId,
    selectedInstrument,
    isRecording,
    isPlaying,
    playbackPosition,
    addRecordedNote,
    clearRecordedNotes,
    setActiveNotes,
    setSelectedMakam,
    setSelectedUsul,
    setSelectedInstrument,
    playMakamScale,
    setIsRecording,
    setIsPlaying,
    setPlaybackPosition,
    scoreTitle,
    setScoreTitle,
    saveScore,
    isSaving,
    saveError,
  } = useEditorStore();

  const playbackRef = useRef<number | null>(null);
  const notesStartTimeRef = useRef<number>(0);
  const activeNoteStartTimes = useRef<Map<number, number>>(new Map());
  const pendingNotes = useRef<Map<number, Partial<NotaEvent>>>(new Map());

  const handleNoteOn = useCallback((midiNumber: number) => {
    setActiveNotes((prev: number[]) => (prev.includes(midiNumber) ? prev : [...prev, midiNumber]));
    
    const now = performance.now();
    const startTimeMs = now - notesStartTimeRef.current;
    
    activeNoteStartTimes.current.set(midiNumber, now);
    
    if (isRecording) {
      pendingNotes.current.set(midiNumber, {
        pitch: midiToNoteName(midiNumber),
        velocity: 100,
        startTime: startTimeMs,
      });
    }
  }, [isRecording, setActiveNotes]);

  const handleNoteOff = useCallback((midiNumber: number) => {
    setActiveNotes((prev: number[]) => prev.filter((n) => n !== midiNumber));
    
    const now = performance.now();
    const noteStartTime = activeNoteStartTimes.current.get(midiNumber);
    
    if (noteStartTime && isRecording) {
      const durationMs = now - noteStartTime;
      const durationSec = Math.max(durationMs / 1000, 0.05);
      
      const pendingNote = pendingNotes.current.get(midiNumber);
      if (pendingNote) {
        const completeNote: NotaEvent = {
          pitch: pendingNote.pitch || midiToNoteName(midiNumber),
          duration: durationSec,
          velocity: pendingNote.velocity || 100,
          startTime: pendingNote.startTime || 0,
        };
        
        addRecordedNote(completeNote);
        pendingNotes.current.delete(midiNumber);
      }
    }
    
    activeNoteStartTimes.current.delete(midiNumber);
  }, [isRecording, addRecordedNote, setActiveNotes]);

  // A3: klavye tusunu secili makamin OTANTIK koma perde-izgarasina snap eder
  // (12-TET degil). Makam yoksa/koma dizisi yoksa null -> esit-tampere.
  const makamSnap = useCallback((midiNumber: number): number | null => {
    const makam = MAKAM_DATA.find((m) => m.id === selectedMakamId);
    return makam ? snapMidiToMakamFrequency(makam, midiNumber) : null;
  }, [selectedMakamId]);

  useMidiInput({
    onNoteOn: handleNoteOn,
    onNoteOff: handleNoteOff,
    enabled: isRecording,
  });

  const startRecording = useCallback(() => {
    clearRecordedNotes();
    setSaveMessage(null);
    notesStartTimeRef.current = performance.now();
    setIsRecording(true);
  }, [clearRecordedNotes, setIsRecording]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, [setIsRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const playRecordedNotes = useCallback(async () => {
    if (recordedNotes.length === 0 || isPlaying) return;

    setIsPlaying(true);
    const startTime = performance.now();
    const sortedNotes = [...recordedNotes].sort((left, right) => left.startTime - right.startTime);
    const scheduledNotes = sortedNotes.map((note) => {
      const match = note.pitch.match(/([A-G]#?)(\d)/);
      if (!match) {
        return {
          midiNumber: 60,
          startTime: note.startTime / 1000,
          duration: note.duration,
        };
      }
      const [, noteName, octaveStr] = match;
      return {
        midiNumber: noteNameToMidi(noteName, parseInt(octaveStr, 10)),
        startTime: note.startTime / 1000,
        duration: note.duration,
      };
    });

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      setPlaybackPosition(elapsed);
      playbackRef.current = requestAnimationFrame(animate);
    };
    playbackRef.current = requestAnimationFrame(animate);

    const totalDuration = await playSequence(scheduledNotes, selectedInstrument);
    if (totalDuration <= 0) {
      if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
      setIsPlaying(false);
      setPlaybackPosition(-1);
      return;
    }

    setTimeout(() => {
      if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
      setIsPlaying(false);
      setPlaybackPosition(-1);
    }, (totalDuration + 0.5) * 1000);
  }, [recordedNotes, isPlaying, selectedInstrument, setIsPlaying, setPlaybackPosition]);

  const stopPlayback = useCallback(() => {
    if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
    stopAll();
    setIsPlaying(false);
    setPlaybackPosition(-1);
  }, [setIsPlaying, setPlaybackPosition]);

  const clearNotes = useCallback(() => {
    clearRecordedNotes();
    setSaveMessage(null);
    stopPlayback();
  }, [clearRecordedNotes, stopPlayback]);

  useEffect(() => {
    return () => {
      if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
    };
  }, []);

  const makamItems = MAKAM_DATA.map((makam) => ({
    key: makam.id,
    label: makam.name,
  }));

  const usulItems = USUL_DATA.map((usul) => ({
    key: usul.id,
    label: usul.name,
  }));

  const instrumentItems = ENSTRUMAN_LIST.filter((instrument) =>
    (MELODIC_INSTRUMENTS as readonly string[]).includes(instrument.id as string)
  ).map((instrument) => ({
    key: instrument.id as string,
    label: i18n.language === "tr" ? instrument.nameTr : instrument.nameEn,
  }));
  const selectedInstrumentName = instrumentItems.find((instrument) => instrument.key === selectedInstrument)?.label ?? selectedInstrument;
  const selectedMakamObj = MAKAM_DATA.find((makam) => makam.id === selectedMakamId);
  const selectedMakamName = selectedMakamObj?.name;
  // A4: otantik 53-EDO koma dizisi (korpus-turevli perde adlariyla)
  const selectedMakamKoma = selectedMakamObj?.komaScale;
  const selectedUsulName = USUL_DATA.find((usul) => usul.id === selectedUsulId)?.name;
  const studioStatus = isRecording
    ? t("notaEditor.statusRecording")
    : isPlaying
      ? t("notaEditor.statusPlaying")
      : recordedNotes.length > 0
        ? t("notaEditor.statusReview")
        : t("notaEditor.statusReady");
  const recordButtonLabel = isRecording
    ? t("notaEditor.stopRecording")
    : recordedNotes.length > 0
      ? t("notaEditor.newTake")
      : t("recording.start");
  const currentStep = recordedNotes.length > 0 ? 3 : isRecording ? 2 : 1;
  const workflowSteps = [
    {
      number: "01",
      title: t("notaEditor.workflowSetupTitle"),
      body: t("notaEditor.workflowSetupBody"),
    },
    {
      number: "02",
      title: t("notaEditor.workflowRecordTitle"),
      body: t("notaEditor.workflowRecordBody"),
    },
    {
      number: "03",
      title: t("notaEditor.workflowReviewTitle"),
      body: t("notaEditor.workflowReviewBody"),
    },
  ];

  return (
    <UnifiedLayout>
      <StudioTabs />
      <div className={`min-h-[calc(100vh-125px)] ${tokens.colors.background.base}`}>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
          <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-semibold uppercase text-[var(--color-primary-600)]">
                {t("notaEditor.eyebrow")}
              </p>
              <h1 className="text-3xl font-bold leading-tight text-[var(--color-text-primary)]">
                {t("notaEditor.title")}
              </h1>
              <p className={`mt-3 max-w-[68ch] text-base leading-relaxed ${tokens.colors.text.secondary}`}>
                {t("notaEditor.subtitle")}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1" aria-label={t("notaEditor.workflowLabel")}>
              {workflowSteps.map((step, index) => {
                const isActive = currentStep === index + 1;
                return (
                  <div
                    key={step.number}
                    className={`rounded-lg border px-4 py-3 transition-colors ${
                      isActive
                        ? "border-[var(--color-primary-300)] bg-[var(--color-primary-50)]"
                        : "border-[var(--color-border-default)] bg-[var(--color-bg-surface)]"
                    }`}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs font-semibold text-[var(--color-primary-600)]">{step.number}</span>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{step.title}</p>
                    </div>
                    <p className={`mt-1 text-xs leading-relaxed ${tokens.colors.text.secondary}`}>{step.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <Card className={`${tokens.colors.border.base} border`}>
                <CardBody className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        {t("notaEditor.setupTitle")}
                      </h2>
                      <p className={`mt-1 text-sm leading-relaxed ${tokens.colors.text.secondary}`}>
                        {t("notaEditor.setupDescription")}
                      </p>
                    </div>
                    <Badge color={isRecording ? "danger" : "primary"} ariaLabel={t("recording.status")}>
                      {studioStatus}
                    </Badge>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <label className="grid gap-2">
                      <span className={`text-xs font-semibold ${tokens.colors.text.secondary}`}>{t("makam.makam")}</span>
                      <Select
                        ariaLabel={t("makam.selectMakam")}
                        items={makamItems}
                        selectedKeys={new Set(selectedMakamId ? [selectedMakamId] : [])}
                        onSelectionChange={(keys) => setSelectedMakam(Array.from(keys)[0] as string)}
                        placeholder={t("makam.selectMakam")}
                      />
                      {/* Otantik 53-EDO koma perdesinde dinle (korpus-turevli;
                          12-TET degil — hicaz'in 113c ikilisi duyulur). */}
                      <Button
                        ariaLabel={t("makam.playScale")}
                        variant="secondary"
                        size="sm"
                        isDisabled={!selectedMakamId || isPlaying}
                        onPress={() => void playMakamScale()}
                      >
                        {isPlaying ? t("common.playing") : t("makam.playScale")}
                      </Button>
                    </label>

                    {/* A4: otantik perde dizisi (korpus-turevli 53-EDO; karar/
                        guclu AEU referansindan). 12-TET degil — koma perdeleri. */}
                    {selectedMakamKoma?.kararPerde && (
                      <div className="rounded-lg border border-[var(--color-border-subtle)] p-3">
                        <div className={`mb-1 flex flex-wrap gap-x-4 gap-y-1 text-xs ${tokens.colors.text.secondary}`}>
                          <span>
                            Karar: <span className="font-semibold text-[var(--color-text-primary)] capitalize">{selectedMakamKoma.kararPerde}</span>
                          </span>
                          {selectedMakamKoma.gucluPerde && (
                            <span>
                              Güçlü: <span className="font-semibold text-[var(--color-text-primary)] capitalize">{selectedMakamKoma.gucluPerde}</span>
                            </span>
                          )}
                          {selectedMakamKoma.seyir && (
                            <span>
                              Seyir: <span className="font-semibold text-[var(--color-text-primary)]">{SEYIR_LABELS[selectedMakamKoma.seyir] ?? selectedMakamKoma.seyir}</span>
                            </span>
                          )}
                          <span>{selectedMakamKoma.degrees.length} perde · 53-EDO</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedMakamKoma.degrees.map((degree, index) => (
                            <span
                              key={`${degree.koma}-${index}`}
                              title={`${degree.cents} cent (${degree.koma} koma)`}
                              className="rounded bg-[var(--color-bg-muted)] px-1.5 py-0.5 text-xs capitalize text-[var(--color-text-primary)]"
                            >
                              {degree.perde ?? `${degree.cents}c`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <label className="grid gap-2">
                      <span className={`text-xs font-semibold ${tokens.colors.text.secondary}`}>{t("usul.usul")}</span>
                      <Select
                        ariaLabel={t("usul.selectUsul")}
                        items={usulItems}
                        selectedKeys={new Set(selectedUsulId ? [selectedUsulId] : [])}
                        onSelectionChange={(keys) => setSelectedUsul(Array.from(keys)[0] as string)}
                        placeholder={t("usul.selectUsul")}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={`text-xs font-semibold ${tokens.colors.text.secondary}`}>{t("makam.instrument")}</span>
                      <Select
                        ariaLabel={t("makam.selectInstrument")}
                        items={instrumentItems}
                        selectedKeys={new Set([selectedInstrument])}
                        onSelectionChange={(keys) => setSelectedInstrument(Array.from(keys)[0] as InstrumentType)}
                        placeholder={t("makam.selectInstrument")}
                      />
                    </label>
                  </div>
                </CardBody>
              </Card>

              <Card className={`${tokens.colors.border.base} border`}>
                <CardBody className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {t("notaEditor.captureTitle")}
                      </p>
                      <p className={`mt-1 text-xs leading-relaxed ${tokens.colors.text.secondary}`}>
                        {t("notaEditor.captureBody")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[var(--color-primary-600)]">{recordedNotes.length}</p>
                      <p className={`text-xs ${tokens.colors.text.secondary}`}>{t("notaEditor.notesRecorded")}</p>
                    </div>
                  </div>
                  <Button
                    ariaLabel={recordButtonLabel}
                    variant={isRecording ? "danger" : "primary"}
                    size="md"
                    className="mt-5 w-full"
                    onPress={toggleRecording}
                  >
                    {recordButtonLabel}
                  </Button>
                </CardBody>
              </Card>
            </aside>

            <div className="min-w-0 space-y-6">
              <Card className={`${tokens.colors.border.base} overflow-hidden border`}>
                <CardBody className="p-0">
                  <div className="flex flex-col gap-3 border-b border-[var(--color-border-subtle)] px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        {t("notaEditor.surfaceTitle", {instrument: selectedInstrumentName})}
                      </h2>
                      <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>
                        {t("notaEditor.surfaceDescription")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge color="primary" ariaLabel={t("makam.title")}>
                        {selectedMakamName ?? t("notaEditor.noMakam")}
                      </Badge>
                      <Badge color="secondary" ariaLabel={t("usul.title")}>
                        {selectedUsulName ?? t("notaEditor.noUsul")}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <InstrumentSurface
                      onNoteOn={handleNoteOn}
                      onNoteOff={handleNoteOff}
                      activeNotes={activeNotes}
                      instrument={selectedInstrument}
                      instrumentName={selectedInstrumentName}
                      noteCountLabel={t("notaEditor.surfacePadCount")}
                      snapToFrequency={makamSnap}
                    />
                  </div>
                </CardBody>
              </Card>

              {recordedNotes.length === 0 ? (
                <Card className={`${tokens.colors.border.base} border`}>
                  <CardBody className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                        {t("notaEditor.emptyOutputTitle")}
                      </p>
                      <p className={`mt-2 max-w-[62ch] text-sm leading-relaxed ${tokens.colors.text.secondary}`}>
                        {t("notaEditor.emptyOutputBody")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">
                      {t("notaEditor.statusReady")}
                    </div>
                  </CardBody>
                </Card>
              ) : (
                <>
                  <Card className={`${tokens.colors.border.base} border`}>
                    <CardBody className="p-5">
                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            {t("notaEditor.timelineTitle")}
                          </h2>
                          <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>
                            {t("notaEditor.timelineDescription")}
                          </p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <PianoRollViewer
                          notes={recordedNotes}
                          playbackPosition={playbackPosition}
                          width={Math.max(520, Math.min(940, recordedNotes.length * 80))}
                          height={280}
                          playAriaLabel={t("common.play")}
                          stopAriaLabel={t("common.stop")}
                          clearAriaLabel={t("common.clear")}
                          emptyStateAriaLabel={t("notaEditor.emptyState")}
                          onPlay={playRecordedNotes}
                          onStop={stopPlayback}
                          onClear={clearNotes}
                          isPlaying={isPlaying}
                        />
                      </div>
                    </CardBody>
                  </Card>

                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <Card className={`${tokens.colors.border.base} border`}>
                      <CardBody className="p-5">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                          {t("notaEditor.notation")}
                        </h2>
                        <div className="mt-4 overflow-x-auto">
                          <VexFlowViewer
                            notes={recordedNotes}
                            width={Math.max(440, Math.min(820, recordedNotes.length * 60 + 100))}
                            height={200}
                          />
                        </div>
                      </CardBody>
                    </Card>

                    <Card className={`${tokens.colors.border.base} border`}>
                      <CardBody className="p-5">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                          {t("notaEditor.savePanelTitle")}
                        </h2>
                        <div className="mt-4">
                          <Input
                            label={t("notaEditor.scoreTitle")}
                            ariaLabel={t("notaEditor.scoreTitle")}
                            value={scoreTitle}
                            onChange={(e) => setScoreTitle(e.target.value)}
                            placeholder={t("notaEditor.scoreTitlePlaceholder")}
                            disabled={isSaving}
                          />
                        </div>
                        <Button
                          variant="primary"
                          className="mt-4 w-full"
                          onPress={async () => {
                            const success = await saveScore();
                            if (success) {
                              setSaveMessage(t("notaEditor.saveSuccess"));
                            }
                          }}
                          disabled={isSaving || !scoreTitle.trim()}
                        >
                          {isSaving ? t("common.saving") : t("common.save")}
                        </Button>
                        {saveError && (
                          <p className="mt-3 text-sm text-[var(--color-error)]">
                            {saveError}
                          </p>
                        )}
                        {saveMessage && (
                          <p className="mt-3 text-sm text-[var(--color-success)]">
                            {saveMessage}
                          </p>
                        )}
                      </CardBody>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </UnifiedLayout>
  );
}

export default memo(NotaEditorPage);
