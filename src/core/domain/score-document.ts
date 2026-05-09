export type ScoreSourceFormat = "musicxml" | "symbtr" | "muzik-json" | "midi";

export interface ScoreMetadata {
  id: string;
  title: string;
  composer?: string;
  makam?: string;
  usul?: string;
  form?: string;
  sourceFormat: ScoreSourceFormat;
  sourceFileRef?: string;
  version: number;
}

export interface ScoreEvent {
  id: string;
  trackId: string;
  measureIndex: number;
  beat: number;
  pitch: string;
  durationBeats: number;
  velocity?: number;
}

export interface ScoreTrack {
  id: string;
  label: string;
  instrumentId: string;
  muted?: boolean;
  solo?: boolean;
  volume?: number;
  pan?: number;
}

export interface ScoreMeasure {
  index: number;
  startBeat: number;
  beatCount: number;
}

export interface ScoreDocument {
  metadata: ScoreMetadata;
  tracks: ScoreTrack[];
  measures: ScoreMeasure[];
  events: ScoreEvent[];
  tempoMap: Array<{ beat: number; bpm: number }>;
  tuning?: string;
  lyrics?: Array<{ eventId: string; text: string }>;
  annotations?: Array<{ beat: number; text: string }>;
}
