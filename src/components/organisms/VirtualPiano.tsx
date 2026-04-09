"use client";

import {useCallback, useRef, memo} from "react";
import {PIANO_KEYS, midiToNoteName} from "@/engines/nota/data";
import {PIANO_CONFIG} from "@/lib/constants";
import {playNote} from "@/engines/ses/engine";
import {tokens} from "@/lib/tokens";

interface VirtualPianoProps {
  onNoteOn?: (midiNumber: number) => void;
  onNoteOff?: (midiNumber: number) => void;
  activeNotes?: number[];
  whiteKeyAriaLabel?: (noteName: string, octave: number) => string;
  blackKeyAriaLabel?: (noteName: string, octave: number) => string;
}

function VirtualPianoComponent({
  onNoteOn,
  onNoteOff,
  activeNotes = [],
  whiteKeyAriaLabel = (noteName, octave) => `${noteName} ${octave} white key`,
  blackKeyAriaLabel = (noteName, octave) => `${noteName} ${octave} black key`,
}: VirtualPianoProps) {
  const activeRef = useRef<Set<number>>(new Set());

  const handleNoteOn = useCallback(async (midiNumber: number) => {
    if (activeRef.current.has(midiNumber)) return;
    activeRef.current.add(midiNumber);
    onNoteOn?.(midiNumber);
    await playNote(midiNumber, 0.5);
  }, [onNoteOn]);

  const handleNoteOff = useCallback((midiNumber: number) => {
    activeRef.current.delete(midiNumber);
    onNoteOff?.(midiNumber);
  }, [onNoteOff]);

  const touchHandler = (
    e: React.TouchEvent | React.MouseEvent,
    midiNumber: number,
    action: "on" | "off"
  ) => {
    e.preventDefault();
    if (action === "on") handleNoteOn(midiNumber);
    else handleNoteOff(midiNumber);
  };

  const blackKeyRelativePositions: Record<string, number> = {
    "C#": -0.5,
    "D#": 0.5,
    "F#": 0.5,
    "G#": -0.5,
    "A#": 0.5,
  };

  const pianoWidth = PIANO_CONFIG.totalOctaves * 7 * PIANO_CONFIG.whiteKeyWidth;

  return (
    <div className={`inline-block ${tokens.colors.primary.base} ${tokens.spacing.sm} ${tokens.radius.lg}`}>
      <div
        className="relative"
        style={{width: pianoWidth, height: PIANO_CONFIG.whiteKeyHeight}}
      >
        {PIANO_KEYS.white.map((key) => {
          const octaveOffset = key.octave - PIANO_CONFIG.startOctave;
          const prevWhiteInOctave = PIANO_KEYS.white.filter(
            (wk) => wk.octave === key.octave && PIANO_KEYS.white.indexOf(wk) < PIANO_KEYS.white.indexOf(key)
          ).length;
          const left = octaveOffset * 7 * PIANO_CONFIG.whiteKeyWidth + prevWhiteInOctave * PIANO_CONFIG.whiteKeyWidth;

          return (
            <button
              key={key.midiNumber}
              className={`absolute top-0 rounded-b-md border border-neutral-600 font-bold text-xs
                transition-colors duration-75 select-none
                ${activeNotes.includes(key.midiNumber)
                  ? `${tokens.colors.accent.base} text-white`
                  : `bg-white ${tokens.colors.text.primary} hover:${tokens.colors.background.base} active:${tokens.colors.background.base}`
                }`}
              style={{
                left,
                width: PIANO_CONFIG.whiteKeyWidth - 2,
                height: PIANO_CONFIG.whiteKeyHeight,
              }}
              aria-label={whiteKeyAriaLabel(key.noteName, key.octave)}
              onMouseDown={(e) => touchHandler(e, key.midiNumber, "on")}
              onMouseUp={(e) => touchHandler(e, key.midiNumber, "off")}
              onMouseLeave={() => handleNoteOff(key.midiNumber)}
              onTouchStart={(e) => touchHandler(e, key.midiNumber, "on")}
              onTouchEnd={(e) => touchHandler(e, key.midiNumber, "off")}
              type="button"
            >
              {midiToNoteName(key.midiNumber)}
            </button>
          );
        })}

        {PIANO_KEYS.black.map((key) => {
          const octaveOffset = key.octave - PIANO_CONFIG.startOctave;
          const prevWhiteInOctave = PIANO_KEYS.white.filter(
            (wk) => wk.octave === key.octave && PIANO_KEYS.white.indexOf(wk) < PIANO_KEYS.white.indexOf(key)
          ).length;
          const basePos = octaveOffset * 7 * PIANO_CONFIG.whiteKeyWidth + prevWhiteInOctave * PIANO_CONFIG.whiteKeyWidth;
          const relOffset = blackKeyRelativePositions[key.noteName] ?? 0;
          const left = basePos + relOffset * PIANO_CONFIG.whiteKeyWidth;

          return (
            <button
              key={key.midiNumber}
              className={`absolute rounded-b-md border border-neutral-500 select-none z-10
                transition-colors duration-75
                ${activeNotes.includes(key.midiNumber)
                  ? tokens.colors.accent.base
                  : `bg-neutral-900 hover:bg-neutral-700 active:bg-neutral-600`
                }`}
              style={{
                left,
                width: PIANO_CONFIG.blackKeyWidth,
                height: PIANO_CONFIG.blackKeyHeight,
              }}
              aria-label={blackKeyAriaLabel(key.noteName, key.octave)}
              onMouseDown={(e) => touchHandler(e, key.midiNumber, "on")}
              onMouseUp={(e) => touchHandler(e, key.midiNumber, "off")}
              onMouseLeave={() => handleNoteOff(key.midiNumber)}
              onTouchStart={(e) => touchHandler(e, key.midiNumber, "on")}
              onTouchEnd={(e) => touchHandler(e, key.midiNumber, "off")}
              type="button"
            />
          );
        })}
      </div>
    </div>
  );
}

export const VirtualPiano = memo(VirtualPianoComponent);
