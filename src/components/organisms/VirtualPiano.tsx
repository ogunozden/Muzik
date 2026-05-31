"use client";

import {useCallback, useRef, memo, useMemo} from "react";
import {PIANO_KEYS} from "@/engines/nota/data";
import {PIANO_CONFIG} from "@/lib/constants";
import {playNote} from "@/engines/ses/engine";
import type {InstrumentType} from "@/engines/ses/engine";
import {tokens} from "@/shared/tokens";
import {formatSolfegePitch, formatSolfegePitchFromMidi} from "@/core/domain/note-naming";

interface VirtualPianoProps {
  onNoteOn?: (midiNumber: number) => void;
  onNoteOff?: (midiNumber: number) => void;
  activeNotes?: number[];
  instrument?: InstrumentType;
  whiteKeyAriaLabel?: (noteName: string, octave: number) => string;
  blackKeyAriaLabel?: (noteName: string, octave: number) => string;
}

function VirtualPianoComponent({
  onNoteOn,
  onNoteOff,
  activeNotes = [],
  instrument = "ud",
  whiteKeyAriaLabel = (noteName, octave) => `${formatSolfegePitch(`${noteName}${octave}`, "spoken")} beyaz tuş`,
  blackKeyAriaLabel = (noteName, octave) => `${formatSolfegePitch(`${noteName}${octave}`, "spoken")} siyah tuş`,
}: VirtualPianoProps) {
  const activeRef = useRef<Set<number>>(new Set());

  const handleNoteOn = useCallback(async (midiNumber: number) => {
    if (activeRef.current.has(midiNumber)) return;
    activeRef.current.add(midiNumber);
    onNoteOn?.(midiNumber);
    await playNote(midiNumber, 0.5, instrument);
  }, [instrument, onNoteOn]);

  const handleNoteOff = useCallback((midiNumber: number) => {
    activeRef.current.delete(midiNumber);
    onNoteOff?.(midiNumber);
  }, [onNoteOff]);

  const touchHandler = useCallback((
    e: React.TouchEvent | React.MouseEvent,
    midiNumber: number,
    action: "on" | "off"
  ) => {
    e.preventDefault();
    if (action === "on") handleNoteOn(midiNumber);
    else handleNoteOff(midiNumber);
  }, [handleNoteOn, handleNoteOff]);

  const whiteKeyPositions = useMemo(() => {
    const whiteIndexMap = new Map<number, number>();
    let currentIndex = 0;
    PIANO_KEYS.white.forEach((key) => {
      whiteIndexMap.set(key.midiNumber, currentIndex);
      currentIndex++;
    });
    return whiteIndexMap;
  }, []);

  const pianoWidth = PIANO_CONFIG.totalOctaves * 7 * PIANO_CONFIG.whiteKeyWidth;

  return (
    <div className={`inline-block ${tokens.colors.primary.base} ${tokens.spacing.sm} ${tokens.radius.lg} overflow-x-auto`}>
      <div
        className="relative"
        style={{width: pianoWidth, height: PIANO_CONFIG.whiteKeyHeight, minWidth: "100%"}}
      >
        {PIANO_KEYS.white.map((key) => {
          const octaveOffset = key.octave - PIANO_CONFIG.startOctave;
          const keyIndex = whiteKeyPositions.get(key.midiNumber) ?? 0;
          const octaveStartIndex = PIANO_KEYS.white.findIndex((wk) => wk.octave === key.octave);
          const prevWhiteInOctave = keyIndex - octaveStartIndex;
          const left = octaveOffset * 7 * PIANO_CONFIG.whiteKeyWidth + prevWhiteInOctave * PIANO_CONFIG.whiteKeyWidth;

          return (
            <button
              key={key.midiNumber}
              className={`absolute top-0 rounded-b-md border border-neutral-600 font-bold text-xs
                transition-colors duration-75 select-none
                ${activeNotes.includes(key.midiNumber)
                  ? `${tokens.colors.accent.base} text-white`
                  : `bg-white ${tokens.colors.text.primary} hover:bg-[var(--color-bg-base)] active:bg-[var(--color-bg-base)]`
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
              {formatSolfegePitchFromMidi(key.midiNumber)}
            </button>
          );
        })}

        {PIANO_KEYS.black.map((key) => {
          const octaveOffset = key.octave - PIANO_CONFIG.startOctave;
          const keyIndex = whiteKeyPositions.get(key.midiNumber - 1) ?? 0;
          const octaveStartIndex = PIANO_KEYS.white.findIndex((wk) => wk.octave === key.octave);
          const prevWhiteInOctave = keyIndex - octaveStartIndex;
          const basePos = octaveOffset * 7 * PIANO_CONFIG.whiteKeyWidth + prevWhiteInOctave * PIANO_CONFIG.whiteKeyWidth;
          const left = basePos + PIANO_CONFIG.whiteKeyWidth - PIANO_CONFIG.blackKeyWidth / 2;

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
