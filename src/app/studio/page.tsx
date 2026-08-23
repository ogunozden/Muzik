"use client";

import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import { UnifiedLayout } from "@/shared/ui/layout/UnifiedLayout";
import { StudioTabs } from "@/features/studio/StudioTabs";
import { VolumeControl } from "@/shared/ui/organisms/VolumeControl";
import { STUDIO_CONFIG } from "@/shared/config/studio.config";
import { useStudioEditor } from "@/app/studio/hooks/useStudioEditor";
import { useStudioPlayback } from "@/app/studio/hooks/useStudioPlayback";
import { useStudioRecording } from "@/app/studio/hooks/useStudioRecording";
import { Badge, Button, Card, CardBody, Input, Select } from "@/shared/ui";
import { tokens } from "@/shared/tokens";

const InstrumentSurface = dynamic(
  () => import("@/shared/ui/organisms/InstrumentSurface").then((mod) => mod.InstrumentSurface),
  { loading: () => <InstrumentSurfaceSkeleton />, ssr: false },
);

const PianoRollViewer = dynamic(
  () => import("@/shared/ui/organisms/PianoRollViewer").then((mod) => mod.PianoRollViewer),
  { loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />, ssr: false },
);

const VexFlowViewer = dynamic(
  () => import("@/shared/ui/organisms/VexFlowViewer").then((mod) => mod.VexFlowViewer),
  { loading: () => <div className="animate-pulse bg-gray-100 h-48 rounded-lg" />, ssr: false },
);

function InstrumentSurfaceSkeleton() {
  return (
    <div className="flex min-h-72 items-end justify-center gap-2 overflow-x-auto rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-5">
      {Array.from({ length: STUDIO_CONFIG.skeleton.count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-md bg-[var(--color-primary-100)]"
          style={{
            width: STUDIO_CONFIG.skeleton.width,
            height: `${STUDIO_CONFIG.skeleton.baseHeight + (index % STUDIO_CONFIG.skeleton.steps) * STUDIO_CONFIG.skeleton.heightStep}px`,
          }}
        />
      ))}
    </div>
  );
}

function NotaEditorPage() {
  const { t } = useTranslation();
  const editor = useStudioEditor();
  const recording = useStudioRecording();
  const playback = useStudioPlayback();

  const handleToggleRecording = useCallback(() => {
    if (editor.isRecording) recording.stopRecording();
    else {
      editor.setSaveMessage(null);
      recording.startRecording();
    }
  }, [editor, recording]);

  const handleClearNotes = useCallback(() => {
    editor.setSaveMessage(null);
    playback.clearNotes();
  }, [editor, playback]);

  return (
    <UnifiedLayout>
      <StudioTabs />
      <div className={`min-h-[calc(100vh-125px)] ${tokens.colors.background.base}`}>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
          <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-semibold uppercase text-[var(--color-primary-600)]">{t("notaEditor.eyebrow")}</p>
              <h1 className="text-3xl font-bold leading-tight text-[var(--color-text-primary)]">{t("notaEditor.title")}</h1>
              <p className={`mt-3 max-w-[68ch] text-base leading-relaxed ${tokens.colors.text.secondary}`}>{t("notaEditor.subtitle")}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1" role="list" aria-label={t("notaEditor.workflowLabel")}>
              {editor.workflowSteps.map((step, index) => {
                const isActive = editor.currentStep === index + 1;
                return (
                  <div
                    key={step.number}
                    role="listitem"
                    aria-current={isActive ? "step" : undefined}
                    className={`rounded-lg border px-4 py-3 transition-colors ${isActive ? "border-[var(--color-primary-300)] bg-[var(--color-primary-50)]" : "border-[var(--color-border-default)] bg-[var(--color-bg-surface)]"}`}
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
                      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t("notaEditor.setupTitle")}</h2>
                      <p className={`mt-1 text-sm leading-relaxed ${tokens.colors.text.secondary}`}>{t("notaEditor.setupDescription")}</p>
                    </div>
                    <Badge color={editor.isRecording ? "danger" : "primary"}>
                      <span className="sr-only">{t("recording.status")}: </span>
                      {editor.studioStatus}
                    </Badge>
                  </div>
                  <div className="mt-5 grid gap-4">
                    <label className="grid gap-2">
                      <span className={`text-xs font-semibold ${tokens.colors.text.secondary}`}>{t("makam.makam")}</span>
                      <Select
                        ariaLabel={t("makam.selectMakam")}
                        items={editor.makamItems}
                        selectedKeys={new Set(editor.selectedMakamId ? [editor.selectedMakamId] : [])}
                        onSelectionChange={(keys) => editor.setSelectedMakam(Array.from(keys)[0] as string)}
                        placeholder={t("makam.selectMakam")}
                      />
                      <Button
                        ariaLabel={editor.isPlaying ? t("common.playing") : t("makam.playScale")}
                        variant="secondary"
                        size="sm"
                        isDisabled={!editor.selectedMakamId || editor.isPlaying}
                        onPress={() => void editor.playMakamScale()}
                      >
                        {editor.isPlaying ? t("common.playing") : t("makam.playScale")}
                      </Button>
                    </label>

                    {editor.selectedMakamKoma?.kararPerde && (
                      <div className="rounded-lg border border-[var(--color-border-subtle)] p-3">
                        <div className={`mb-1 flex flex-wrap gap-x-4 gap-y-1 text-xs ${tokens.colors.text.secondary}`}>
                          <span>
                            Karar:{" "}
                            <span className="font-semibold text-[var(--color-text-primary)] capitalize">
                              {editor.selectedMakamKoma.kararPerde}
                            </span>
                          </span>
                          {editor.selectedMakamKoma.gucluPerde && (
                            <span>
                              Güçlü:{" "}
                              <span className="font-semibold text-[var(--color-text-primary)] capitalize">
                                {editor.selectedMakamKoma.gucluPerde}
                              </span>
                            </span>
                          )}
                          {editor.selectedMakamKoma.seyir && (
                            <span>
                              Seyir:{" "}
                              <span className="font-semibold text-[var(--color-text-primary)]">
                                {editor.seyirLabels[editor.selectedMakamKoma.seyir] ?? editor.selectedMakamKoma.seyir}
                              </span>
                            </span>
                          )}
                          <span>{editor.selectedMakamKoma.degrees.length} perde · 53-EDO</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {editor.selectedMakamKoma.degrees.map((degree, index) => (
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

                    {editor.selectedMakamObj?.seyir && (
                      <details className="rounded-lg border border-[var(--color-border-subtle)] p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-[var(--color-text-primary)]">
                          Seyir <span className="font-normal capitalize opacity-70">({editor.selectedMakamObj.seyir.yon})</span>
                          <span className="ml-1 text-xs font-normal opacity-50">— Gönül</span>
                        </summary>
                        <p className={`mt-2 text-sm leading-relaxed ${tokens.colors.text.secondary}`}>{editor.selectedMakamObj.seyir.metin}</p>
                      </details>
                    )}

                    <label className="grid gap-2">
                      <span className={`text-xs font-semibold ${tokens.colors.text.secondary}`}>{t("usul.usul")}</span>
                      <Select
                        ariaLabel={t("usul.selectUsul")}
                        items={editor.usulItems}
                        selectedKeys={new Set(editor.selectedUsulId ? [editor.selectedUsulId] : [])}
                        onSelectionChange={(keys) => editor.setSelectedUsul(Array.from(keys)[0] as string)}
                        placeholder={t("usul.selectUsul")}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={`text-xs font-semibold ${tokens.colors.text.secondary}`}>{t("makam.instrument")}</span>
                      <Select
                        ariaLabel={t("makam.selectInstrument")}
                        items={editor.instrumentItems}
                        selectedKeys={new Set([editor.selectedInstrument])}
                        onSelectionChange={(keys) => editor.setSelectedInstrument(Array.from(keys)[0] as string as typeof editor.selectedInstrument)}
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
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t("notaEditor.captureTitle")}</p>
                      <p className={`mt-1 text-xs leading-relaxed ${tokens.colors.text.secondary}`}>{t("notaEditor.captureBody")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[var(--color-primary-600)]">{editor.recordedNotes.length}</p>
                      <p className={`text-xs ${tokens.colors.text.secondary}`}>{t("notaEditor.notesRecorded")}</p>
                    </div>
                  </div>
                  <Button
                    ariaLabel={editor.recordButtonLabel}
                    variant={editor.isRecording ? "danger" : "primary"}
                    size="md"
                    className="mt-5 w-full"
                    onPress={handleToggleRecording}
                  >
                    {editor.recordButtonLabel}
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
                        {t("notaEditor.surfaceTitle", { instrument: editor.selectedInstrumentName })}
                      </h2>
                      <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>{t("notaEditor.surfaceDescription")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge color="primary">
                        <span className="sr-only">{t("makam.title")}: </span>
                        {editor.selectedMakamName ?? t("notaEditor.noMakam")}
                      </Badge>
                      <Badge color="secondary">
                        <span className="sr-only">{t("usul.title")}: </span>
                        {editor.selectedUsulName ?? t("notaEditor.noUsul")}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <InstrumentSurface
                      onNoteOn={recording.handleNoteOn}
                      onNoteOff={recording.handleNoteOff}
                      activeNotes={editor.activeNotes}
                      instrument={editor.selectedInstrument}
                      instrumentName={editor.selectedInstrumentName}
                      noteCountLabel={t("notaEditor.surfacePadCount")}
                      snapToFrequency={editor.makamSnap}
                    />
                  </div>
                </CardBody>
              </Card>

              {editor.recordedNotes.length === 0 ? (
                <Card className={`${tokens.colors.border.base} border`}>
                  <CardBody className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="text-lg font-semibold text-[var(--color-text-primary)]">{t("notaEditor.emptyOutputTitle")}</p>
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
                          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t("notaEditor.timelineTitle")}</h2>
                          <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>{t("notaEditor.timelineDescription")}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <VolumeControl volume={playback.volume} onVolumeChange={playback.setVolume} />
                          <label className={`grid gap-1 text-sm ${tokens.colors.text.secondary}`}>
                            <span className="text-xs font-semibold uppercase">Tekrar</span>
                            <span className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label="Tekrar azalt"
                                disabled={playback.repeatCount <= STUDIO_CONFIG.repeat.min}
                                onClick={playback.decrementRepeat}
                                className="rounded-md border border-[var(--color-border-default)] px-2 py-0.5 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-40"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
                                {playback.repeatCount}×
                              </span>
                              <button
                                type="button"
                                aria-label="Tekrar artır"
                                disabled={playback.repeatCount >= STUDIO_CONFIG.repeat.max}
                                onClick={playback.incrementRepeat}
                                className="rounded-md border border-[var(--color-border-default)] px-2 py-0.5 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-40"
                              >
                                +
                              </button>
                            </span>
                          </label>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <PianoRollViewer
                          notes={editor.recordedNotes}
                          playbackPosition={editor.playbackPosition}
                          width={Math.max(
                            STUDIO_CONFIG.pianoRoll.minWidth,
                            Math.min(STUDIO_CONFIG.pianoRoll.maxWidth, editor.recordedNotes.length * STUDIO_CONFIG.pianoRoll.widthPerNote),
                          )}
                          height={STUDIO_CONFIG.pianoRoll.height}
                          playAriaLabel={t("common.play")}
                          stopAriaLabel={t("common.stop")}
                          clearAriaLabel={t("common.clear")}
                          emptyStateAriaLabel={t("notaEditor.emptyState")}
                          onPlay={playback.playRecordedNotes}
                          onStop={playback.stopPlayback}
                          onClear={handleClearNotes}
                          isPlaying={editor.isPlaying}
                        />
                      </div>
                    </CardBody>
                  </Card>

                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <Card className={`${tokens.colors.border.base} border`}>
                      <CardBody className="p-5">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t("notaEditor.notation")}</h2>
                        <div className="mt-4 overflow-x-auto">
                          <VexFlowViewer
                            notes={editor.recordedNotes}
                            width={Math.max(
                              STUDIO_CONFIG.vexFlow.minWidth,
                              Math.min(STUDIO_CONFIG.vexFlow.maxWidth, editor.recordedNotes.length * STUDIO_CONFIG.vexFlow.widthPerNote + STUDIO_CONFIG.vexFlow.baseWidth),
                            )}
                            height={STUDIO_CONFIG.vexFlow.height}
                          />
                        </div>
                      </CardBody>
                    </Card>

                    <Card className={`${tokens.colors.border.base} border`}>
                      <CardBody className="p-5">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t("notaEditor.savePanelTitle")}</h2>
                        <div className="mt-4">
                          <Input
                            label={t("notaEditor.scoreTitle")}
                            ariaLabel={t("notaEditor.scoreTitle")}
                            value={editor.scoreTitle}
                            onChange={(event) => editor.setScoreTitle(event.target.value)}
                            placeholder={t("notaEditor.scoreTitlePlaceholder")}
                            disabled={editor.isSaving}
                          />
                        </div>
                        <Button
                          variant="primary"
                          className="mt-4 w-full"
                          onPress={() => void editor.handleSave()}
                          disabled={editor.isSaving || !editor.scoreTitle.trim()}
                        >
                          {editor.isSaving ? t("common.saving") : t("common.save")}
                        </Button>
                        {editor.saveError && (
                          <p role="alert" className="mt-3 text-sm text-[var(--color-error)]">
                            {editor.saveError}
                          </p>
                        )}
                        {editor.saveMessage && (
                          <p role="status" className="mt-3 text-sm text-[var(--color-success)]">
                            {editor.saveMessage}
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
