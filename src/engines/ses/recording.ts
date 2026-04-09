"use client";

import {NotaEvent} from "@/types";
import {midiToNoteName} from "@/engines/nota/data";

export interface PitchDetectionResult {
  frequency: number;
  confidence: number;
  midiNumber: number;
  noteName: string;
}

export async function detectPitchFromBuffer(
  buffer: AudioBuffer,
  sampleRate: number
): Promise<PitchDetectionResult | null> {
  const data = buffer.getChannelData(0);
  const bufferLength = data.length;

  const minFreq = 60;
  const maxFreq = 2000;
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);

  let bestCorrelation = 0;
  let bestPeriod = 0;

  for (let period = minPeriod; period <= maxPeriod; period++) {
    let correlation = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < bufferLength - period; i++) {
      correlation += data[i] * data[i + period];
      norm1 += data[i] * data[i];
      norm2 += data[i + period] * data[i + period];
    }

    const normalizedCorrelation = correlation / (Math.sqrt(norm1 * norm2) + 1e-10);

    if (normalizedCorrelation > bestCorrelation) {
      bestCorrelation = normalizedCorrelation;
      bestPeriod = period;
    }
  }

  if (bestCorrelation < 0.8 || bestPeriod === 0) {
    return null;
  }

  const frequency = sampleRate / bestPeriod;
  const midiNumber = Math.round(69 + 12 * Math.log2(frequency / 440));
  const noteName = midiToNoteName(midiNumber);

  return {
    frequency,
    confidence: bestCorrelation,
    midiNumber,
    noteName,
  };
}

export function detectPitchFromData(
  data: Float32Array,
  sampleRate: number
): PitchDetectionResult | null {
  const minFreq = 60;
  const maxFreq = 2000;
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);

  let bestCorrelation = 0;
  let bestPeriod = 0;

  for (let period = minPeriod; period <= maxPeriod; period++) {
    let correlation = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < data.length - period; i++) {
      correlation += data[i] * data[i + period];
      norm1 += data[i] * data[i];
      norm2 += data[i + period] * data[i + period];
    }

    const normalizedCorrelation = correlation / (Math.sqrt(norm1 * norm2) + 1e-10);

    if (normalizedCorrelation > bestCorrelation) {
      bestCorrelation = normalizedCorrelation;
      bestPeriod = period;
    }
  }

  if (bestCorrelation < 0.8 || bestPeriod === 0) {
    return null;
  }

  const frequency = sampleRate / bestPeriod;
  const midiNumber = Math.round(69 + 12 * Math.log2(frequency / 440));
  const noteName = midiToNoteName(midiNumber);

  return {
    frequency,
    confidence: bestCorrelation,
    midiNumber,
    noteName,
  };
}

export function convertPitchToNotaEvents(
  pitches: PitchDetectionResult[],
  minDuration: number = 0.3
): NotaEvent[] {
  if (pitches.length === 0) return [];

  const events: NotaEvent[] = [];
  let currentNote: PitchDetectionResult | null = null;
  let noteStartTime = 0;

  for (let idx = 0; idx < pitches.length; idx++) {
    const pitch = pitches[idx];
    if (currentNote === null) {
      currentNote = pitch;
      noteStartTime = idx;
    } else if (pitch.noteName !== currentNote.noteName) {
      events.push({
        pitch: currentNote.noteName,
        duration: Math.max(minDuration, (idx - noteStartTime) * 0.1),
        velocity: Math.round(currentNote.confidence * 127),
        startTime: noteStartTime * 1000,
      });
      currentNote = pitch;
      noteStartTime = idx;
    }
  }

  if (currentNote !== null) {
    const lastIdx = pitches.length - 1;
    events.push({
      pitch: currentNote.noteName,
      duration: Math.max(minDuration, (lastIdx - noteStartTime + 1) * 0.1),
      velocity: Math.round(currentNote.confidence * 127),
      startTime: noteStartTime * 1000,
    });
  }

  return events;
}
