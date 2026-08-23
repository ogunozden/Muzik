"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { noteNameToMidi } from "@/engines/nota/data";
import { getHeardPlaybackPosition, playSequence, stopAll } from "@/engines/ses/engine";
import { usePlaybackVolume } from "@/shared/ui/organisms/VolumeControl";
import { STUDIO_CONFIG } from "@/shared/config/studio.config";
import { getSequenceDuration, repeatScheduledNotes, wrapSequencePosition } from "@/app/studio/playback-helpers";
import { useEditorStore } from "@/store/editorStore";

export function useStudioPlayback() {
  const { recordedNotes, selectedInstrument, isPlaying, setIsPlaying, setPlaybackPosition, clearRecordedNotes } =
    useEditorStore();

  const [volume, setVolume] = usePlaybackVolume();
  const [repeatCount, setRepeatCount] = useState<number>(STUDIO_CONFIG.repeat.default);
  const playbackRef = useRef<number | null>(null);

  const stopPlayback = useCallback(() => {
    if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
    stopAll();
    setIsPlaying(false);
    setPlaybackPosition(STUDIO_CONFIG.playback.inactivePosition);
  }, [setIsPlaying, setPlaybackPosition]);

  const playRecordedNotes = useCallback(async () => {
    if (recordedNotes.length === 0 || isPlaying) return;
    setIsPlaying(true);
    const sortedNotes = [...recordedNotes].sort((left, right) => left.startTime - right.startTime);
    const scheduledNotes = sortedNotes.map((note) => {
      const match = note.pitch.match(/([A-G]#?)(\d)/);
      if (!match) {
        return {
          midiNumber: STUDIO_CONFIG.recording.fallbackMidi,
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

    const sequenceDuration = getSequenceDuration(scheduledNotes);
    const notesToSchedule =
      repeatCount > 1 ? repeatScheduledNotes(scheduledNotes, repeatCount) : scheduledNotes;
    const { durationSeconds, baseTime } = await playSequence(notesToSchedule, selectedInstrument, {
      gainScale: volume,
    });
    if (durationSeconds <= 0 || !(sequenceDuration > 0)) {
      if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
      setIsPlaying(false);
      setPlaybackPosition(STUDIO_CONFIG.playback.inactivePosition);
      return;
    }
    const totalDuration = sequenceDuration * Math.max(1, repeatCount);

    const animate = () => {
      const heard = getHeardPlaybackPosition(baseTime);
      const position =
        repeatCount > 1 ? wrapSequencePosition(heard, sequenceDuration) : Math.min(heard, totalDuration);
      setPlaybackPosition(position);
      playbackRef.current = requestAnimationFrame(animate);
    };
    playbackRef.current = requestAnimationFrame(animate);

    setTimeout(() => {
      if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
      setIsPlaying(false);
      setPlaybackPosition(STUDIO_CONFIG.playback.inactivePosition);
    }, (totalDuration + STUDIO_CONFIG.playback.tailSeconds) * 1000);
  }, [recordedNotes, isPlaying, repeatCount, selectedInstrument, volume, setIsPlaying, setPlaybackPosition]);

  const clearNotes = useCallback(() => {
    clearRecordedNotes();
    stopPlayback();
  }, [clearRecordedNotes, stopPlayback]);

  const decrementRepeat = useCallback(() => {
    setRepeatCount((count) => Math.max(STUDIO_CONFIG.repeat.min, count - 1));
  }, []);

  const incrementRepeat = useCallback(() => {
    setRepeatCount((count) => Math.min(STUDIO_CONFIG.repeat.max, count + 1));
  }, []);

  useEffect(() => {
    return () => {
      if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
    };
  }, []);

  return {
    volume,
    setVolume,
    repeatCount,
    setRepeatCount,
    decrementRepeat,
    incrementRepeat,
    isPlaying,
    playRecordedNotes,
    stopPlayback,
    clearNotes,
  };
}
