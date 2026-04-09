"use client";

import {useMemo} from "react";
import {NotaEvent} from "@/types";
import {PIANO_CONFIG, NOTE_NAMES} from "@/lib/constants";
import {tokens} from "@/lib/tokens";
import {PlaybackControls} from "@/components/molecules/PlaybackControls";

interface PianoRollViewerProps {
  notes: NotaEvent[];
  playbackPosition?: number;
  width?: number;
  height?: number;
  playAriaLabel: string;
  stopAriaLabel: string;
  clearAriaLabel: string;
  emptyStateAriaLabel: string;
  onPlay: () => void;
  onStop: () => void;
  onClear: () => void;
  isPlaying: boolean;
  className?: string;
}

interface RollNote extends NotaEvent {
  x: number;
  y: number;
  w: number;
}

export function PianoRollViewer({
  notes,
  playbackPosition = -1,
  width = 800,
  height = 300,
  playAriaLabel,
  stopAriaLabel,
  clearAriaLabel,
  emptyStateAriaLabel,
  onPlay,
  onStop,
  onClear,
  isPlaying,
  className = "",
}: PianoRollViewerProps) {
  const PIXELS_PER_SECOND = 100;
  const NOTE_HEIGHT = 20;
  const LABEL_WIDTH = 60;

  const {rollNotes, totalHeight, totalWidth} = useMemo(() => {
    if (notes.length === 0) {
      return {rollNotes: [], totalHeight: 0, totalWidth: 0};
    }
    const minTime = Math.min(...notes.map((n) => n.startTime));
    const mapped: RollNote[] = notes.map((note) => {
      const noteLabel = note.pitch.replace("#", "").replace(/\d+/, "");
      const noteOctave = parseInt(note.pitch.match(/\d+/)?.[0] ?? "4");
      const noteIndex = NOTE_NAMES.indexOf(noteLabel as typeof NOTE_NAMES[number]);
      const octaveOffset = noteOctave - PIANO_CONFIG.startOctave;
      const totalIndex = octaveOffset * 12 + noteIndex;
      const y = totalIndex * NOTE_HEIGHT;
      return {
        ...note,
        x: ((note.startTime - minTime) / 1000) * PIXELS_PER_SECOND,
        y,
        w: note.duration * PIXELS_PER_SECOND,
      };
    });
    const tH = PIANO_CONFIG.totalOctaves * 12 * NOTE_HEIGHT;
    const tW = mapped.length > 0 ? Math.max(...mapped.map((n) => n.x + n.w)) + 100 : 0;
    return {rollNotes: mapped, totalHeight: tH, totalWidth: tW};
  }, [notes]);

  const gridRows = useMemo(() => {
    const rows: {key: string; top: number}[] = [];
    for (let octave = 0; octave < PIANO_CONFIG.totalOctaves; octave++) {
      for (const noteName of NOTE_NAMES) {
        const octaveOffset = octave;
        const noteIndex = NOTE_NAMES.indexOf(noteName);
        const totalIndex = octaveOffset * 12 + noteIndex;
        rows.push({
          key: `grid-${octave}-${noteName}`,
          top: totalIndex * NOTE_HEIGHT,
        });
      }
    }
    return rows;
  }, []);

  const noteLabels = useMemo(() => {
    return NOTE_NAMES.map((noteName, idx) => ({
      key: noteName,
      label: noteName,
      top: idx * NOTE_HEIGHT,
    }));
  }, []);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <PlaybackControls
        onPlay={onPlay}
        onStop={onStop}
        onClear={onClear}
        isPlaying={isPlaying}
        playAriaLabel={playAriaLabel}
        stopAriaLabel={stopAriaLabel}
        clearAriaLabel={clearAriaLabel}
      />
      
      <div
        className={`border ${tokens.colors.border.base} ${tokens.radius.lg} ${tokens.colors.background.surface} flex items-center justify-center text-sm ${tokens.colors.text.secondary}`}
        style={{width, height}}
        role="img"
        aria-label={emptyStateAriaLabel}
      >
        {notes.length === 0 ? (
          <span>{emptyStateAriaLabel}</span>
        ) : (
          <div
            className="border border-red-500 rounded-lg overflow-auto bg-white"
            style={{width, height}}
          >
            <div
              className="relative"
              style={{width: totalWidth + LABEL_WIDTH, height: totalHeight}}
            >
              {playbackPosition >= 0 && (
                <div
                  className="absolute top-0 w-0.5 z-20"
                  style={{
                    left: playbackPosition * PIXELS_PER_SECOND + LABEL_WIDTH,
                    height: totalHeight,
                    backgroundColor: "#C4A77D",
                  }}
                />
              )}

              {rollNotes.map((note, idx) => (
                <div
                  key={`${note.startTime}-${note.pitch}-${idx}`}
                  className="absolute rounded-sm"
                  style={{
                    left: note.x + LABEL_WIDTH,
                    top: note.y,
                    width: Math.max(note.w, 4),
                    height: NOTE_HEIGHT - 2,
                    backgroundColor: "#5C4033",
                    opacity: 0.8,
                  }}
                />
              ))}

              {gridRows.map((row) => (
                <div
                  key={row.key}
                  className="absolute left-0 right-0 border-b border-neutral-100"
                  style={{top: row.top, height: NOTE_HEIGHT}}
                />
              ))}

              {noteLabels.map((item) => (
                <div
                  key={`label-${item.key}`}
                  className={`absolute left-0 flex items-center text-xs ${tokens.colors.text.secondary} bg-white border-r ${tokens.colors.border.base}`}
                  style={{top: item.top, width: LABEL_WIDTH, height: NOTE_HEIGHT}}
                >
                  <span className="pl-1 truncate">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
