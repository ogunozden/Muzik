"use client";

import {useCallback, useRef} from "react";
import {PIANO_KEYS, midiToNoteName} from "@/engines/nota/data";
import {PIANO_CONFIG} from "@/lib/constants";
import {playNote} from "@/engines/ses/engine";
import type {InstrumentType} from "@/engines/ses/engine";

interface VirtualPianoProps {
  onNoteOn?: (midiNumber: number) => void;
  onNoteOff?: (midiNumber: number) => void;
  activeNotes?: number[];
  instrument?: InstrumentType;
}

export function VirtualPiano({onNoteOn, onNoteOff, activeNotes = [], instrument = "ud"}: VirtualPianoProps) {
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
    <div className="inline-block bg-neutral-800 p-2 rounded-lg">
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
              aria-label={`Piano key ${midiToNoteName(key.midiNumber)}`}
              className={`absolute top-0 rounded-b-md border border-neutral-600 font-bold text-xs
                transition-colors duration-75 select-none
                ${activeNotes.includes(key.midiNumber)
                  ? "bg-[#C4A77D] text-white"
                  : "bg-white text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200"
                }`}
              style={{
                left,
                width: PIANO_CONFIG.whiteKeyWidth - 2,
                height: PIANO_CONFIG.whiteKeyHeight,
              }}
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
              aria-label={`Piano key ${midiToNoteName(key.midiNumber)}`}
              className={`absolute rounded-b-md border border-neutral-500 select-none z-10
                transition-colors duration-75
                ${activeNotes.includes(key.midiNumber)
                  ? "bg-[#C4A77D]"
                  : "bg-neutral-900 hover:bg-neutral-700 active:bg-neutral-600"
                }`}
              style={{
                left,
                width: PIANO_CONFIG.blackKeyWidth,
                height: PIANO_CONFIG.blackKeyHeight,
              }}
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
