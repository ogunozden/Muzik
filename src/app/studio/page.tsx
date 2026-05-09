"use client";

import { useCallback, useRef, useEffect, memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody } from "@/components/atoms/Card";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import dynamic from "next/dynamic";
import { Select } from "@/components/atoms/Select";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useMidiInput } from "@/hooks/useMidiInput";
import { MAKAM_DATA } from "@/engines/makam/data";
import { USUL_DATA } from "@/engines/usul/data";
import { midiToNoteName, noteNameToMidi } from "@/engines/nota/data";
import { playSequence, stopAll } from "@/engines/ses/engine";
import type { InstrumentType } from "@/engines/ses/engine";
import { ENSTRUMAN_LIST, MELODIC_INSTRUMENTS } from "@/lib/centralized";
import { NotaEvent } from "@/types";
import { tokens } from "@/lib/tokens";
import { useEditorStore } from "@/store/editorStore";

// Dynamic imports for heavy components
const VirtualPiano = dynamic(
  () => import("@/components/ui/VirtualPiano").then((mod) => mod.VirtualPiano),
  {
    loading: () => <PianoSkeleton />,
    ssr: false,
  }
);

const PianoRollViewer = dynamic(
  () => import("@/components/organisms/PianoRollViewer").then((mod) => mod.PianoRollViewer),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />,
    ssr: false,
  }
);

const VexFlowViewer = dynamic(
  () => import("@/components/organisms/VexFlowViewer").then((mod) => mod.VexFlowViewer),
  {
    loading: () => <div className="animate-pulse bg-gray-100 h-48 rounded-lg" />,
    ssr: false,
  }
);

// Piano loading skeleton
function PianoSkeleton() {
  return (
    <div className="flex items-end justify-center gap-1 p-4 bg-[var(--color-primary)] rounded-lg overflow-x-auto">
      {Array.from({ length: 21 }).map((_, i) => (
        <div
          key={i}
          className="bg-white/50 rounded-b animate-pulse"
          style={{ width: 46, height: `${80 + (i % 5) * 20}px` }}
        />
      ))}
    </div>
  );
}

function NotaEditorPage() {
  const { t } = useTranslation();
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
    label: instrument.nameTr,
  }));

  return (
    <UnifiedLayout>
      <div className={`max-w-5xl mx-auto px-6 py-12 ${tokens.colors.background.base}`}>
        {/* Başlık */}
        <div className="mb-10">
          <h1 className={`text-3xl font-bold ${tokens.colors.accent.base} mb-2`}>
            {t("notaEditor.title")}
          </h1>
          <p className={`text-sm ${tokens.colors.text.secondary}`}>
            {t("notaEditor.subtitle")}
          </p>
        </div>

        {/* Kontroller */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-8`}>
          <div className={`${tokens.colors.background.surface} ${tokens.radius.lg} ${tokens.colors.border.base} border ${tokens.spacing.sm}`}>
            <p className={`text-xs ${tokens.colors.text.secondary} mb-2`}>{t("makam.title")}</p>
            <Select
              ariaLabel={t("makam.selectMakam")}
              items={makamItems}
              selectedKeys={new Set(selectedMakamId ? [selectedMakamId] : [])}
              onSelectionChange={(keys) => setSelectedMakam(Array.from(keys)[0] as string)}
              placeholder={t("makam.selectMakam")}
            />
          </div>

          <div className={`${tokens.colors.background.surface} ${tokens.radius.lg} ${tokens.colors.border.base} border ${tokens.spacing.sm}`}>
            <p className={`text-xs ${tokens.colors.text.secondary} mb-2`}>{t("usul.title")}</p>
            <Select
              ariaLabel={t("usul.selectUsul")}
              items={usulItems}
              selectedKeys={new Set(selectedUsulId ? [selectedUsulId] : [])}
              onSelectionChange={(keys) => setSelectedUsul(Array.from(keys)[0] as string)}
              placeholder={t("usul.selectUsul")}
            />
          </div>

          <div className={`${tokens.colors.background.surface} ${tokens.radius.lg} ${tokens.colors.border.base} border ${tokens.spacing.sm}`}>
            <p className={`text-xs ${tokens.colors.text.secondary} mb-2`}>{t("makam.instrument")}</p>
            <Select
              ariaLabel={t("makam.selectInstrument")}
              items={instrumentItems}
              selectedKeys={new Set([selectedInstrument])}
              onSelectionChange={(keys) => setSelectedInstrument(Array.from(keys)[0] as InstrumentType)}
              placeholder={t("makam.selectInstrument")}
            />
          </div>

          <div className={`${tokens.colors.background.surface} ${tokens.radius.lg} ${tokens.colors.border.base} border ${tokens.spacing.sm} flex flex-col justify-center`}>
            <p className={`text-xs ${tokens.colors.text.secondary} mb-2`}>{t("recording.status")}</p>
            <Button
              ariaLabel={isRecording ? t("notaEditor.stopRecording") : t("recording.start")}
              variant={isRecording ? "accent" : "primary"}
              size="sm"
              onPress={toggleRecording}
            >
              {isRecording ? "■ " + t("common.stop") : "● " + t("recording.start")}
            </Button>
          </div>
        </div>

        {/* Piano - Dynamic Load */}
        <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border mb-6`}>
          <CardBody className="p-4">
            <div className="flex justify-center overflow-x-auto">
              <VirtualPiano
                onNoteOn={handleNoteOn}
                onNoteOff={handleNoteOff}
                activeNotes={activeNotes}
                instrument={selectedInstrument}
              />
            </div>
          </CardBody>
        </Card>

        {/* Piano Roll - Dynamic Load */}
        {recordedNotes.length > 0 && (
          <PianoRollViewer
            notes={recordedNotes}
            playbackPosition={playbackPosition}
            width={Math.max(350, Math.min(700, recordedNotes.length * 80))}
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
        )}

        {/* Kayıt Durumu */}
        {isRecording && (
          <div className={`flex items-center gap-3 mt-4 ${tokens.colors.background.surface} ${tokens.radius.md} p-3`}>
            <Badge color="danger" ariaLabel={t("recording.status")}>
              ● {t("recording.status")}
            </Badge>
            <span className={`text-sm ${tokens.colors.text.secondary}`}>
              {recordedNotes.length} {t("notaEditor.notesRecorded")}
            </span>
          </div>
        )}

        {recordedNotes.length > 0 && (
          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border mt-6`}>
            <CardBody className="p-4">
              <p className={`text-xs ${tokens.colors.text.secondary} mb-3 font-semibold`}>
                🎼 {t("notaEditor.notation", "Nota Gösterimi")}
              </p>
              <VexFlowViewer
                notes={recordedNotes}
                width={Math.max(400, Math.min(800, recordedNotes.length * 60 + 100))}
                height={200}
              />
            </CardBody>
          </Card>
        )}

        {/* Eseri Kaydet */}
        {recordedNotes.length > 0 && (
          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border mt-6`}>
            <CardBody className="p-4 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <p className={`text-xs ${tokens.colors.text.secondary} mb-2`}>
                  {t("notaEditor.scoreTitle", "Eser Başlığı")}
                </p>
                <Input
                  ariaLabel={t("notaEditor.scoreTitle", "Eser Başlığı")}
                  value={scoreTitle}
                  onChange={(e) => setScoreTitle(e.target.value)}
                  placeholder={t("notaEditor.scoreTitlePlaceholder", "Örn: Nihavend Peşrev")}
                  disabled={isSaving}
                />
              </div>
              <div className="w-full md:w-auto">
                <Button
                  variant="primary"
                  onPress={async () => {
                    const success = await saveScore();
                    if (success) {
                      setSaveMessage(t("notaEditor.saveSuccess"));
                    }
                  }}
                  disabled={isSaving || !scoreTitle.trim()}
                >
                  {isSaving ? t("common.saving", "Kaydediliyor...") : t("common.save", "Kaydet")}
                </Button>
              </div>
            </CardBody>
            {saveError && (
              <div className="px-4 pb-4 text-red-500 text-sm">
                {saveError}
              </div>
            )}
            {saveMessage && (
              <div className="px-4 pb-4 text-[var(--color-success)] text-sm">
                {saveMessage}
              </div>
            )}
          </Card>
        )}
      </div>
    </UnifiedLayout>
  );
}

export default memo(NotaEditorPage);
