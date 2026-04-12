/**
 * Audio Service - Merkezi Ses Servisi
 * Web Audio API üzerinden ses çalma işlemleri
 */

import type { InstrumentType } from "@/engines/ses/instruments";
import type { ScheduledNote } from "@/engines/ses/engine";
import {
  initAudio,
  playNote,
  playScale,
  playRhythm,
  playSequence,
  stopAll,
  clearSampleCache,
} from "@/engines/ses/engine";
import { appConfig } from "@/lib/config";

/**
 * Audio Service state
 */
interface AudioServiceState {
  isInitialized: boolean;
  isPlaying: boolean;
  currentInstrument: InstrumentType;
  bpm: number;
}

/**
 * Audio Service singleton
 */
class AudioService {
  private static instance: AudioService | null = null;
  private state: AudioServiceState = {
    isInitialized: false,
    isPlaying: false,
    currentInstrument: "ud",
    bpm: appConfig.audio.defaultBpm,
  };

  private constructor() {}

  /**
   * Singleton instance getter
   */
  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  /**
   * Audio context'i başlat
   */
  async initialize(): Promise<boolean> {
    if (this.state.isInitialized) return true;
    
    try {
      const success = await initAudio();
      this.state.isInitialized = success;
      return success;
    } catch (error) {
      console.error("AudioService: Failed to initialize", error);
      return false;
    }
  }

  /**
   * Tek nota çal
   */
  async playNote(
    midiNumber: number,
    duration: number = 0.5,
    instrument?: InstrumentType
  ): Promise<void> {
    await this.initialize();
    await playNote(midiNumber, duration, instrument ?? this.state.currentInstrument);
  }

  /**
   * Makam scale çal
   */
  async playScale(
    notes: number[],
    duration: number = 0.4,
    instrument?: InstrumentType
  ): Promise<void> {
    await this.initialize();
    await playScale(notes, duration, instrument ?? this.state.currentInstrument);
  }

  /**
   * Usül ritmi çal
   */
  async playRhythm(
    beats: number,
    symbols: Array<{ beat: number; symbol: string; isAccent: boolean }>,
    bpm?: number,
    percussionInstrument?: InstrumentType
  ): Promise<void> {
    await this.initialize();
    this.state.isPlaying = true;
    try {
      await playRhythm(beats, symbols, bpm ?? this.state.bpm, percussionInstrument);
    } finally {
      this.state.isPlaying = false;
    }
  }

  /**
   * Nota dizisi çal
   */
  async playSequence(
    notes: ScheduledNote[],
    instrument?: InstrumentType
  ): Promise<number> {
    await this.initialize();
    this.state.isPlaying = true;
    try {
      return await playSequence(notes, instrument ?? this.state.currentInstrument);
    } finally {
      this.state.isPlaying = false;
    }
  }

  /**
   * Tüm sesleri durdur
   */
  stopAll(): void {
    stopAll();
    this.state.isPlaying = false;
  }

  /**
   * Sample cache'i temizle
   */
  clearCache(): void {
    clearSampleCache();
  }

  /**
   * Audio context'e eriş
   */
  getContext(): AudioContext | null {
    if (typeof globalThis.AudioContext !== 'undefined') {
      return new AudioContext();
    }
    return null;
  }

  /**
   * State getters
   */
  get isInitialized(): boolean {
    return this.state.isInitialized;
  }

  get isPlaying(): boolean {
    return this.state.isPlaying;
  }

  get currentInstrument(): InstrumentType {
    return this.state.currentInstrument;
  }

  get bpm(): number {
    return this.state.bpm;
  }

  /**
   * State setters
   */
  setInstrument(instrument: InstrumentType): void {
    this.state.currentInstrument = instrument;
  }

  setBpm(bpm: number): void {
    const { minBpm, maxBpm } = appConfig.audio;
    this.state.bpm = Math.max(minBpm, Math.min(maxBpm, bpm));
  }
}

/**
 * Export singleton instance
 */
export const audioService = AudioService.getInstance();

/**
 * Audio service hook-friendly exports
 */
export const audioServiceActions = {
  initialize: () => audioService.initialize(),
  playNote: (midi: number, duration?: number, instrument?: InstrumentType) => 
    audioService.playNote(midi, duration, instrument),
  playScale: (notes: number[], duration?: number, instrument?: InstrumentType) => 
    audioService.playScale(notes, duration, instrument),
  playRhythm: (
    beats: number,
    symbols: Array<{ beat: number; symbol: string; isAccent: boolean }>,
    bpm?: number,
    percussion?: InstrumentType
  ) => audioService.playRhythm(beats, symbols, bpm, percussion),
  playSequence: (notes: ScheduledNote[], instrument?: InstrumentType) => 
    audioService.playSequence(notes, instrument),
  stopAll: () => audioService.stopAll(),
  clearCache: () => audioService.clearCache(),
};

export type AudioServiceInstance = AudioService;
