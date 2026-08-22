"use client";

import { useCallback, useRef } from "react";
import { midiToNoteName } from "@/engines/nota/data";
import { useMidiInput } from "@/shared/hooks/useMidiInput";
import { STUDIO_CONFIG } from "@/shared/config/studio.config";
import { useEditorStore } from "@/store/editorStore";
import type { NotaEvent } from "@/core/domain/models";

export function useStudioRecording() {
  const { isRecording, setIsRecording, addRecordedNote, setActiveNotes, clearRecordedNotes } = useEditorStore();

  const notesStartTimeRef = useRef<number>(0);
  const activeNoteStartTimes = useRef<Map<number, number>>(new Map());
  const pendingNotes = useRef<Map<number, Partial<NotaEvent>>>(new Map());

  const handleNoteOn = useCallback(
    (midiNumber: number) => {
      setActiveNotes((prev: number[]) => (prev.includes(midiNumber) ? prev : [...prev, midiNumber]));
      const now = performance.now();
      const startTimeMs = now - notesStartTimeRef.current;
      activeNoteStartTimes.current.set(midiNumber, now);
      if (isRecording) {
        pendingNotes.current.set(midiNumber, {
          pitch: midiToNoteName(midiNumber),
          velocity: STUDIO_CONFIG.recording.defaultVelocity,
          startTime: startTimeMs,
        });
      }
    },
    [isRecording, setActiveNotes],
  );

  const handleNoteOff = useCallback(
    (midiNumber: number) => {
      setActiveNotes((prev: number[]) => prev.filter((n) => n !== midiNumber));
      const now = performance.now();
      const noteStartTime = activeNoteStartTimes.current.get(midiNumber);
      if (noteStartTime && isRecording) {
        const durationMs = now - noteStartTime;
        const durationSec = Math.max(durationMs / 1000, STUDIO_CONFIG.recording.minDurationSec);
        const pendingNote = pendingNotes.current.get(midiNumber);
        if (pendingNote) {
          const completeNote: NotaEvent = {
            pitch: pendingNote.pitch || midiToNoteName(midiNumber),
            duration: durationSec,
            velocity: pendingNote.velocity || STUDIO_CONFIG.recording.defaultVelocity,
            startTime: pendingNote.startTime || 0,
          };
          addRecordedNote(completeNote);
          pendingNotes.current.delete(midiNumber);
        }
      }
      activeNoteStartTimes.current.delete(midiNumber);
    },
    [isRecording, addRecordedNote, setActiveNotes],
  );

  useMidiInput({
    onNoteOn: handleNoteOn,
    onNoteOff: handleNoteOff,
    enabled: isRecording,
  });

  const startRecording = useCallback(() => {
    clearRecordedNotes();
    notesStartTimeRef.current = performance.now();
    pendingNotes.current.clear();
    activeNoteStartTimes.current.clear();
    setIsRecording(true);
  }, [clearRecordedNotes, setIsRecording]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, [setIsRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    handleNoteOn,
    handleNoteOff,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
