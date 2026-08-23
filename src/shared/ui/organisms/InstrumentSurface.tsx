"use client";

import {memo, useCallback, useMemo, useRef} from "react";
import {PIANO_KEYS, midiToNoteName} from "@/engines/nota/data";
import {playNote, playNoteAtFrequency} from "@/engines/ses/engine";
import type {InstrumentType} from "@/engines/ses/engine";
import {tokens} from "@/shared/tokens";
import {
  INSTRUMENT_SURFACE_CLASSES,
  MELODIC_INSTRUMENT_SURFACES,
  type InstrumentSurfaceConfig,
  type MelodicInstrument,
} from "@/shared/tokens/instrument-surfaces";

// Gorsel yuzey sozlesmesi merkezi token katmaninda tanimlidir; API uyumlulugu
// icin buradan yeniden disa aktarilir (mevcut testler bu export'u kullanir).
export {MELODIC_INSTRUMENT_SURFACES};
export type {InstrumentSurfaceConfig};

interface InstrumentSurfaceProps {
  onNoteOn?: (midiNumber: number) => void;
  onNoteOff?: (midiNumber: number) => void;
  activeNotes?: number[];
  instrument?: InstrumentType;
  instrumentName?: string;
  noteCountLabel?: string;
  /**
   * Tusu makam koma perde-izgarasina SNAP eden fonksiyon (A3). Bir frekans
   * dondururse o OTANTIK perde calinir (12-TET degil); null ise 12-TET.
   */
  snapToFrequency?: (midiNumber: number) => number | null;
}

interface NoteKey {
  midiNumber: number;
  noteName: string;
  octave: number;
  label: string;
}

function isMelodicInstrument(instrument: InstrumentType): instrument is MelodicInstrument {
  return instrument in MELODIC_INSTRUMENT_SURFACES;
}

function chunkNotes(notes: NoteKey[], size: number): NoteKey[][] {
  const chunks: NoteKey[][] = [];
  for (let index = 0; index < notes.length; index += size) {
    chunks.push(notes.slice(index, index + size));
  }
  return chunks;
}

function makeNoteKeys(): NoteKey[] {
  return [...PIANO_KEYS.white, ...PIANO_KEYS.black]
    .sort((left, right) => left.midiNumber - right.midiNumber)
    .map((key) => ({
      midiNumber: key.midiNumber,
      noteName: key.noteName,
      octave: key.octave,
      label: midiToNoteName(key.midiNumber),
    }));
}

function InstrumentSurfaceComponent({
  onNoteOn,
  onNoteOff,
  activeNotes = [],
  instrument = "ud",
  instrumentName,
  noteCountLabel = "36 notes",
  snapToFrequency,
}: InstrumentSurfaceProps) {
  const activeRef = useRef<Set<number>>(new Set());
  const selectedInstrument = isMelodicInstrument(instrument) ? instrument : "ud";
  const config = MELODIC_INSTRUMENT_SURFACES[selectedInstrument];
  const displayName = instrumentName ?? config.name;
  const notes = useMemo(() => makeNoteKeys(), []);
  const rows = useMemo(() => chunkNotes(notes, 12), [notes]);

  const handleNoteOn = useCallback(async (midiNumber: number) => {
    if (activeRef.current.has(midiNumber)) return;
    activeRef.current.add(midiNumber);
    onNoteOn?.(midiNumber);
    // Makam secili + koma dizisi varsa tusu otantik koma perdesine snap et
    // (12-TET degil); yoksa esit-tampere cal.
    const snapped = snapToFrequency?.(midiNumber) ?? null;
    if (snapped) {
      await playNoteAtFrequency(snapped, 0.5, selectedInstrument);
    } else {
      await playNote(midiNumber, 0.5, selectedInstrument);
    }
  }, [onNoteOn, selectedInstrument, snapToFrequency]);

  const handleNoteOff = useCallback((midiNumber: number) => {
    activeRef.current.delete(midiNumber);
    onNoteOff?.(midiNumber);
  }, [onNoteOff]);

  const triggerNote = useCallback((
    event: React.MouseEvent | React.TouchEvent,
    midiNumber: number,
    action: "on" | "off",
  ) => {
    event.preventDefault();
    if (action === "on") void handleNoteOn(midiNumber);
    else handleNoteOff(midiNumber);
  }, [handleNoteOn, handleNoteOff]);

  const noteButton = (note: NoteKey, className = "") => {
    const isActive = activeNotes.includes(note.midiNumber);

    return (
      <button
        key={`${selectedInstrument}-${note.midiNumber}`}
        type="button"
        aria-label={`${displayName} ${note.label} note`}
        data-testid="instrument-note"
        data-midi={note.midiNumber}
        className={`${INSTRUMENT_SURFACE_CLASSES.keyBase} ${INSTRUMENT_SURFACE_CLASSES.keyInset} ${className} ${
          isActive
            ? "border-white bg-[var(--color-primary-600)] text-white"
            : INSTRUMENT_SURFACE_CLASSES.keyUp
        }`}
        onMouseDown={(event) => triggerNote(event, note.midiNumber, "on")}
        onMouseUp={(event) => triggerNote(event, note.midiNumber, "off")}
        onMouseLeave={() => handleNoteOff(note.midiNumber)}
        onTouchStart={(event) => triggerNote(event, note.midiNumber, "on")}
        onTouchEnd={(event) => triggerNote(event, note.midiNumber, "off")}
      >
        {note.label}
      </button>
    );
  };

  const renderStringSurface = () => (
    <div
      className={INSTRUMENT_SURFACE_CLASSES.frameString}
      style={{background: `linear-gradient(135deg, ${config.tone}, ${config.detail})`}}
    >
      <div className="absolute left-5 top-6 h-[calc(100%-3rem)] w-44 rounded-[48%] border border-black/20 bg-black/10" />
      <div className="absolute left-16 top-1/2 h-44 w-36 -translate-y-1/2 rounded-[50%] border border-black/20 bg-white/10" />
      <div className="absolute left-28 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full border border-black/25 bg-black/25" />
      <div className="absolute left-44 right-5 top-1/2 h-28 -translate-y-1/2 rounded-lg border border-black/10 bg-black/10" />
      <div className="absolute left-52 right-8 top-1/2 grid -translate-y-1/2 gap-3">
        {Array.from({length: config.stringCount}).map((_, index) => (
          <span key={`string-line-${index}`} className={INSTRUMENT_SURFACE_CLASSES.stringLine} />
        ))}
      </div>
      <div className="relative ml-40 grid gap-2">
        {chunkNotes(notes, 6).map((row, rowIndex) => (
          <div key={`string-${rowIndex}`} className="relative grid grid-cols-6 gap-2">
            {row.map((note) => noteButton(note))}
          </div>
        ))}
      </div>
    </div>
  );

  const renderZitherSurface = () => (
    <div
      className={INSTRUMENT_SURFACE_CLASSES.frameZither}
      style={{background: `linear-gradient(135deg, ${config.tone}, ${config.accent})`}}
    >
      <div
        className="absolute inset-4 border border-black/10 bg-white/10"
        style={{
          clipPath: selectedInstrument === "kanun" ? "polygon(0 0, 100% 7%, 93% 100%, 0 92%)" : "polygon(2% 0, 100% 0, 97% 100%, 0 100%)",
        }}
      />
      <div className="absolute inset-x-10 top-8 grid gap-3">
        {Array.from({length: Math.min(config.stringCount, 14)}).map((_, index) => (
          <span key={`zither-line-${index}`} className="h-px bg-white/55" />
        ))}
      </div>
      <div className="relative grid gap-3">
        {rows.map((row, rowIndex) => (
          <div key={`zither-${rowIndex}`} className="relative grid grid-cols-12 gap-1.5">
            {row.map((note) => noteButton(note, selectedInstrument === "kanun" ? "min-w-9" : "min-w-10"))}
          </div>
        ))}
      </div>
      {selectedInstrument === "kanun" && (
        <div className="relative mt-4 flex gap-1 pl-4">
          {Array.from({length: 18}).map((_, index) => (
            <span key={`mandal-${index}`} className="h-3 w-1 rounded-sm bg-black/35" />
          ))}
        </div>
      )}
    </div>
  );

  const renderBowedSurface = () => (
    <div
      className={INSTRUMENT_SURFACE_CLASSES.frameBowed}
      style={{background: `linear-gradient(145deg, ${config.tone}, ${config.detail})`}}
    >
      <div className="absolute left-1/2 top-5 h-[calc(100%-2.5rem)] w-32 -translate-x-1/2 rounded-full border border-black/20 bg-white/10" />
      <div className="absolute left-[calc(50%-5rem)] top-6 h-[calc(100%-3rem)] w-2 rotate-6 rounded-full bg-black/25" />
      <div className="absolute left-[calc(50%+4rem)] top-6 h-[calc(100%-3rem)] w-1 -rotate-6 rounded-full bg-white/45" />
      <div className="relative grid grid-cols-3 gap-4">
        {chunkNotes(notes, 12).map((row, rowIndex) => (
          <div key={`bowed-${rowIndex}`} className="relative grid gap-1.5">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/65" />
            {row.map((note) => noteButton(note, "h-8"))}
          </div>
        ))}
      </div>
    </div>
  );

  const renderWindSurface = () => (
    <div
      className={INSTRUMENT_SURFACE_CLASSES.frameString}
      style={{background: `linear-gradient(135deg, ${config.tone}, ${config.accent})`}}
    >
      <div className={INSTRUMENT_SURFACE_CLASSES.windBody} />
      <div className="absolute left-16 right-16 top-1/2 flex -translate-y-1/2 justify-between">
        {Array.from({length: 8}).map((_, index) => (
          <span key={`wind-hole-${index}`} className={INSTRUMENT_SURFACE_CLASSES.windHole} />
        ))}
      </div>
      <div className="relative grid gap-2">
        {rows.map((row, rowIndex) => (
          <div key={`wind-${rowIndex}`} className="grid grid-cols-12 gap-1.5">
            {row.map((note) => noteButton(note, rowIndex === 1 ? "rounded-full" : ""))}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPipeSurface = () => (
    <div
      className={INSTRUMENT_SURFACE_CLASSES.frameString}
      style={{background: `linear-gradient(135deg, ${config.tone}, ${config.accent})`}}
    >
      <div className="grid grid-cols-12 items-end gap-2">
        {notes.slice(0, 24).map((note, index) => (
          <div key={`pipe-${note.midiNumber}`} className="flex flex-col items-center gap-1">
            <div
              className={INSTRUMENT_SURFACE_CLASSES.pipeBody}
              style={{height: `${54 + (index % 12) * 6}px`}}
            />
            {noteButton(note, "min-w-9")}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-12 gap-2">
        {notes.slice(24).map((note) => noteButton(note, "min-w-9"))}
      </div>
    </div>
  );

  const renderSurface = () => {
    switch (config.layout) {
      case "zither":
        return renderZitherSurface();
      case "bowed":
        return renderBowedSurface();
      case "wind":
        return renderWindSurface();
      case "pipes":
        return renderPipeSurface();
      case "string":
      default:
        return renderStringSurface();
    }
  };

  return (
    <section
      aria-label={`${displayName} input surface`}
      data-testid="instrument-surface"
      data-instrument={selectedInstrument}
      data-layout={config.layout}
      className={`w-full overflow-x-auto ${tokens.colors.background.base} ${tokens.radius.md} border border-[var(--color-border-subtle)] p-3`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className={`text-lg font-semibold ${tokens.colors.text.primary}`}>{displayName}</h2>
          <p className={`text-xs ${tokens.colors.text.secondary}`}>{noteCountLabel}</p>
        </div>
        <div
          aria-hidden="true"
          className="h-3 w-16 rounded-full"
          style={{background: `linear-gradient(90deg, ${config.tone}, ${config.accent})`}}
        />
      </div>
      {renderSurface()}
    </section>
  );
}

export const InstrumentSurface = memo(InstrumentSurfaceComponent);
