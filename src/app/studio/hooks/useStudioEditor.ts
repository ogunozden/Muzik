"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MAKAM_DATA, snapMidiToMakamFrequency } from "@/engines/makam/data";
import { USUL_DATA } from "@/engines/usul/data";
import { INSTRUMENTS, MELODIC_INSTRUMENTS } from "@/shared/config/instruments";
import { SEYIR_LABELS, STUDIO_CONFIG } from "@/shared/config/studio.config";
import { useEditorStore } from "@/store/editorStore";
import type { InstrumentType } from "@/engines/ses/engine";

export function useStudioEditor() {
  const { t, i18n } = useTranslation();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const {
    recordedNotes,
    activeNotes,
    selectedMakamId,
    selectedUsulId,
    selectedInstrument,
    isRecording,
    isPlaying,
    playbackPosition,
    bpm,
    scoreTitle,
    setScoreTitle,
    saveScore,
    isSaving,
    saveError,
    setSelectedMakam,
    setSelectedUsul,
    setSelectedInstrument,
    playMakamScale,
    setIsRecording,
    setIsPlaying,
    setPlaybackPosition,
    clearRecordedNotes,
    addRecordedNote,
    setActiveNotes,
  } = useEditorStore();

  const makamSnap = useCallback(
    (midiNumber: number): number | null => {
      const makam = MAKAM_DATA.find((item) => item.id === selectedMakamId);
      return makam ? snapMidiToMakamFrequency(makam, midiNumber) : null;
    },
    [selectedMakamId],
  );

  const makamItems = useMemo(() => MAKAM_DATA.map((makam) => ({ key: makam.id, label: makam.name })), []);

  const usulItems = useMemo(() => USUL_DATA.map((usul) => ({ key: usul.id, label: usul.name })), []);

  const instrumentItems = useMemo(
    () =>
      INSTRUMENTS.filter((instrument) => (MELODIC_INSTRUMENTS as readonly string[]).includes(instrument.id as string)).map(
        (instrument) => ({
          key: instrument.id as string,
          label: i18n.language === "tr" ? instrument.nameTr : instrument.nameEn,
        }),
      ),
    [i18n.language],
  );

  const selectedInstrumentName = useMemo(
    () => instrumentItems.find((instrument) => instrument.key === selectedInstrument)?.label ?? selectedInstrument,
    [instrumentItems, selectedInstrument],
  );

  const selectedMakamObj = useMemo(() => MAKAM_DATA.find((makam) => makam.id === selectedMakamId) ?? null, [selectedMakamId]);

  const selectedMakamName = selectedMakamObj?.name ?? null;
  const selectedMakamKoma = selectedMakamObj?.komaScale ?? null;

  const selectedUsulName = useMemo(
    () => USUL_DATA.find((usul) => usul.id === selectedUsulId)?.name ?? null,
    [selectedUsulId],
  );

  const studioStatus = useMemo(() => {
    if (isRecording) return t("notaEditor.statusRecording");
    if (isPlaying) return t("notaEditor.statusPlaying");
    if (recordedNotes.length > 0) return t("notaEditor.statusReview");
    return t("notaEditor.statusReady");
  }, [isPlaying, isRecording, recordedNotes.length, t]);

  const recordButtonLabel = useMemo(() => {
    if (isRecording) return t("notaEditor.stopRecording");
    if (recordedNotes.length > 0) return t("notaEditor.newTake");
    return t("recording.start");
  }, [isRecording, recordedNotes.length, t]);

  const currentStep = recordedNotes.length > 0 ? 3 : isRecording ? 2 : 1;

  const workflowSteps = useMemo(
    () => [
      { number: "01", title: t("notaEditor.workflowSetupTitle"), body: t("notaEditor.workflowSetupBody") },
      { number: "02", title: t("notaEditor.workflowRecordTitle"), body: t("notaEditor.workflowRecordBody") },
      { number: "03", title: t("notaEditor.workflowReviewTitle"), body: t("notaEditor.workflowReviewBody") },
    ],
    [t],
  );

  const handleSave = useCallback(async () => {
    const success = await saveScore();
    if (success) setSaveMessage(t("notaEditor.saveSuccess"));
    return success;
  }, [saveScore, t]);

  return {
    // store state
    recordedNotes,
    activeNotes,
    selectedMakamId,
    selectedUsulId,
    selectedInstrument,
    isRecording,
    isPlaying,
    playbackPosition,
    bpm,
    scoreTitle,
    isSaving,
    saveError,
    saveMessage,
    setSaveMessage,
    // derived
    makamItems,
    usulItems,
    instrumentItems,
    selectedInstrumentName,
    selectedMakamObj,
    selectedMakamName,
    selectedMakamKoma,
    selectedUsulName,
    studioStatus,
    recordButtonLabel,
    currentStep,
    workflowSteps,
    seyirLabels: SEYIR_LABELS,
    studioConfig: STUDIO_CONFIG,
    // actions
    setActiveNotes,
    setSelectedMakam,
    setSelectedUsul,
    setSelectedInstrument,
    playMakamScale,
    setIsRecording,
    setIsPlaying,
    setPlaybackPosition,
    clearRecordedNotes,
    addRecordedNote,
    setScoreTitle,
    handleSave,
    makamSnap,
  };
}
