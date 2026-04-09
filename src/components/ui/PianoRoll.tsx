"use client";

import {useMemo} from "react";
import {NotaEvent} from "@/types";
import {PIANO_CONFIG, NOTE_NAMES} from "@/lib/constants";

interface PianoRollProps {
  notes: NotaEvent[];
  playbackPosition?: number;
  width?: number;
  height?: number;
}

interface RollNote extends NotaEvent {
  x: number;
  y: number;
  w: number;
}

export function PianoRoll({
  notes,
  playbackPosition = -1,
  width = 800,
  height = 300,
}: PianoRollProps) {
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

  if (notes.length === 0) {
    return (
      <div
        className="border border-[#E5E0D8] rounded-lg bg-neutral-50 flex items-center justify-center text-[#6B6B6B] text-sm"
        style={{width, height}}
      >
        Kaydedilen nota yok
      </div>
    );
  }

  return (
    <div
      className="border border-[#E5E0D8] rounded-lg overflow-auto bg-white"
      style={{width, height}}
    >
      <div
        className="relative"
        style={{width: totalWidth + LABEL_WIDTH, height: totalHeight}}
      >
        {playbackPosition >= 0 && (
          <div
            className="absolute top-0 w-0.5 bg-[#C4A77D] z-20"
            style={{left: playbackPosition * PIXELS_PER_SECOND + LABEL_WIDTH, height: totalHeight}}
          />
        )}

        {rollNotes.map((note, noteIndex) => (
          <div
            key={`note-${note.startTime}-${note.pitch}-${noteIndex}`}
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
            className="absolute left-0 flex items-center text-xs text-[#6B6B6B] bg-white border-r border-[#E5E0D8]"
            style={{top: item.top, width: LABEL_WIDTH, height: NOTE_HEIGHT}}
          >
            <span className="pl-1 truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
