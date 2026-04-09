"use client";

import {useState, useCallback, useRef, useEffect} from "react";
import {useTranslation} from "react-i18next";
import {Card, CardBody} from "@heroui/react";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {VirtualPiano} from "@/components/ui/VirtualPiano";
import {PianoRollViewer} from "@/components/organisms/PianoRollViewer";
import {Select} from "@/components/atoms/Select";
import {Badge} from "@/components/atoms/Badge";
import {Button} from "@/components/atoms/Button";
import {useMidiInput} from "@/hooks/useMidiInput";
import {MAKAM_DATA} from "@/engines/makam/data";
import {USUL_DATA} from "@/engines/usul/data";
import {midiToNoteName, noteNameToMidi} from "@/engines/nota/data";
import {playSequence} from "@/engines/ses/engine";
import {NotaEvent} from "@/types";
import {tokens} from "@/lib/tokens";

export default function NotaEditorPage() {
  const {t} = useTranslation();
  const [recordedNotes, setRecordedNotes] = useState<NotaEvent[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMakam, setSelectedMakam] = useState<string>("");
  const [selectedUsul, setSelectedUsul] = useState<string>("");
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(-1);
  const playbackRef = useRef<number | null>(null);
  const notesStartTimeRef = useRef<number>(0);
  
  // Note duration tracking
  const activeNoteStartTimes = useRef<Map<number, number>>(new Map());
  const pendingNotes = useRef<Map<number, Partial<NotaEvent>>>(new Map());

  const handleNoteOn = useCallback((midiNumber: number) => {
    setActiveNotes((prev) => (prev.includes(midiNumber) ? prev : [...prev, midiNumber]));
    
    const now = performance.now();
    const startTimeMs = now - notesStartTimeRef.current;
    
    // Track when this note started
    activeNoteStartTimes.current.set(midiNumber, now);
    
    if (isRecording) {
      // Store pending note (duration will be updated on note off)
      pendingNotes.current.set(midiNumber, {
        pitch: midiToNoteName(midiNumber),
        velocity: 100,
        startTime: startTimeMs,
      });
    }
  }, [isRecording]);

  const handleNoteOff = useCallback((midiNumber: number) => {
    setActiveNotes((prev) => prev.filter((n) => n !== midiNumber));
    
    const now = performance.now();
    const noteStartTime = activeNoteStartTimes.current.get(midiNumber);
    
    if (noteStartTime && isRecording) {
      // Calculate actual duration
      const durationMs = now - noteStartTime;
      const durationSec = Math.max(durationMs / 1000, 0.05); // Minimum 50ms
      
      // Get pending note and update duration
      const pendingNote = pendingNotes.current.get(midiNumber);
      if (pendingNote) {
        const completeNote: NotaEvent = {
          pitch: pendingNote.pitch || midiToNoteName(midiNumber),
          duration: durationSec,
          velocity: pendingNote.velocity || 100,
          startTime: pendingNote.startTime || 0,
        };
        
        setRecordedNotes((prev) => [...prev, completeNote]);
        pendingNotes.current.delete(midiNumber);
      }
    }
    
    activeNoteStartTimes.current.delete(midiNumber);
  }, [isRecording]);

  useMidiInput({
    onNoteOn: handleNoteOn,
    onNoteOff: handleNoteOff,
    enabled: isRecording,
  });

  const startRecording = useCallback(() => {
    setRecordedNotes([]);
    notesStartTimeRef.current = performance.now();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

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

    const totalDuration = await playSequence(scheduledNotes);
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
  }, [recordedNotes, isPlaying]);

  const stopPlayback = useCallback(() => {
    if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
    setIsPlaying(false);
    setPlaybackPosition(-1);
  }, []);

  const clearNotes = useCallback(() => {
    setRecordedNotes([]);
    stopPlayback();
  }, [stopPlayback]);

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

  return (
    <UnifiedLayout>
      <div className={`max-w-5xl mx-auto px-4 py-8 ${tokens.colors.background.base}`}>
        <h1 className={`text-3xl font-bold ${tokens.colors.accent.base} mb-6`}>
          {t("notaEditor.title")}
        </h1>

        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8`}>
          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border`}>
            <CardBody className="p-4">
              <p className={`text-xs ${tokens.colors.text.secondary} mb-2`}>{t("makam.title")}</p>
              <Select
                ariaLabel={t("makam.selectMakam")}
                items={makamItems}
                selectedKeys={new Set(selectedMakam ? [selectedMakam] : [])}
                onSelectionChange={(keys) => setSelectedMakam(Array.from(keys)[0] as string)}
                placeholder={t("makam.selectMakam")}
              />
            </CardBody>
          </Card>

          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border`}>
            <CardBody className="p-4">
              <p className={`text-xs ${tokens.colors.text.secondary} mb-2`}>{t("usul.title")}</p>
              <Select
                ariaLabel={t("usul.selectUsul")}
                items={usulItems}
                selectedKeys={new Set(selectedUsul ? [selectedUsul] : [])}
                onSelectionChange={(keys) => setSelectedUsul(Array.from(keys)[0] as string)}
                placeholder={t("usul.selectUsul")}
              />
            </CardBody>
          </Card>

          <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border`}>
            <CardBody className="p-4">
              <p className={`text-xs ${tokens.colors.text.secondary} mb-2`}>{t("recording.status")}</p>
              <Button
                ariaLabel={isRecording ? t("notaEditor.stopRecording") : t("recording.start")}
                variant={isRecording ? "accent" : "primary"}
                size="sm"
                onPress={toggleRecording}
              >
                {isRecording ? "■ " + t("common.stop") : "● " + t("recording.start")}
              </Button>
            </CardBody>
          </Card>
        </div>

        <Card className={`${tokens.colors.background.surface} ${tokens.colors.border.base} border mb-6`}>
          <CardBody className="p-4">
            <div className="flex justify-center overflow-x-auto">
              <VirtualPiano
                onNoteOn={handleNoteOn}
                onNoteOff={handleNoteOff}
                activeNotes={activeNotes}
              />
            </div>
          </CardBody>
        </Card>

        {recordedNotes.length > 0 && (
          <PianoRollViewer
            notes={recordedNotes}
            playbackPosition={playbackPosition}
            width={Math.max(700, recordedNotes.length * 80)}
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

        {isRecording && (
          <div className={`flex items-center gap-2 mt-4 ${tokens.colors.background.surface} ${tokens.radius.md} p-3`}>
            <Badge color="danger" ariaLabel={t("recording.status")}>
              ● {t("recording.status")}
            </Badge>
            <span className={`text-sm ${tokens.colors.text.secondary}`}>
              {recordedNotes.length} {t("notaEditor.notesRecorded")}
            </span>
          </div>
        )}
      </div>
    </UnifiedLayout>
  );
}
