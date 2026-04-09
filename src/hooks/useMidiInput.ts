"use client";

import {useEffect, useRef, useCallback} from "react";

interface MidiMessageEvent {
  data: Uint8Array;
}

interface MidiInput {
  onmidimessage: ((event: MidiMessageEvent) => void) | null;
}

interface MidiAccess {
  inputs: Map<string, MidiInput>;
}

interface UseMidiInputOptions {
  onNoteOn?: (midiNumber: number, velocity: number) => void;
  onNoteOff?: (midiNumber: number) => void;
  enabled?: boolean;
}

export function useMidiInput({onNoteOn, onNoteOff, enabled = true}: UseMidiInputOptions) {
  const midiAccessRef = useRef<MidiAccess | null>(null);
  const activeNotesRef = useRef<Set<number>>(new Set());

  const handleMidiMessage = useCallback((event: MidiMessageEvent) => {
    const [status, note, velocity] = event.data as Uint8Array;
    const command = status >> 4;

    if (command === 9 && velocity > 0) {
      onNoteOn?.(note, velocity);
      activeNotesRef.current.add(note);
    } else if (command === 8 || (command === 9 && velocity === 0)) {
      onNoteOff?.(note);
      activeNotesRef.current.delete(note);
    }
  }, [onNoteOn, onNoteOff]);

  useEffect(() => {
    if (!enabled) return;

    async function initMidi() {
      try {
        const midiAccess = await navigator.requestMIDIAccess() as unknown as MidiAccess;
        midiAccessRef.current = midiAccess;

        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = handleMidiMessage;
        }
      } catch {
        // MIDI not available
      }
    }

    initMidi();

    return () => {
      for (const input of midiAccessRef.current?.inputs.values() ?? []) {
        input.onmidimessage = null;
      }
      midiAccessRef.current = null;
    };
  }, [enabled, handleMidiMessage]);

  return {
    isSupported: typeof navigator !== "undefined" && "requestMIDIAccess" in navigator,
    activeNotes: Array.from(activeNotesRef.current),
  };
}
