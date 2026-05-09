/**
 * Pitch Detection Utility
 * Uses autocorrelation algorithm for fundamental frequency detection.
 * Works with microphone input from MediaRecorder API.
 */

export interface PitchDetectionResult {
  frequency: number;
  confidence: number;
  noteName: string;
  midiNumber: number;
  cents: number; // deviation from nearest note in cents (-50 to +50)
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4_FREQ = 440;
const A4_MIDI = 69;

/**
 * Convert frequency to MIDI note number
 */
export function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / A4_FREQ) + A4_MIDI);
}

/**
 * Convert MIDI note number to frequency
 */
export function midiToFrequency(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * Convert frequency to note name (e.g., "A4", "C#5")
 */
export function frequencyToNoteName(frequency: number): { noteName: string; cents: number } {
  const midiFloat = 12 * Math.log2(frequency / A4_FREQ) + A4_MIDI;
  const midiRounded = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midiRounded) * 100);

  const octave = Math.floor(midiRounded / 12) - 1;
  const noteName = `${NOTE_NAMES[midiRounded % 12]}${octave}`;

  return { noteName, cents };
}

/**
 * Autocorrelation-based pitch detection
 * @param audioData - Float32Array of audio samples (mono)
 * @param sampleRate - Sample rate in Hz
 * @returns Detected frequency in Hz, or -1 if no pitch detected
 */
export function detectPitchAutocorrelation(audioData: Float32Array, sampleRate: number): number {
  const bufferLength = audioData.length;
  const maxLag = Math.floor(sampleRate / 50); // Min frequency ~50 Hz
  const minLag = Math.floor(sampleRate / 2000); // Max frequency ~2000 Hz

  // Find the RMS (root mean square) to check if there's enough signal
  let rms = 0;
  for (let i = 0; i < bufferLength; i++) {
    rms += audioData[i] * audioData[i];
  }
  rms = Math.sqrt(rms / bufferLength);
  if (rms < 0.01) return -1; // Signal too weak

  // Compute normalized autocorrelation
  let bestCorrelation = -1;
  let bestLag = -1;

  for (let lag = minLag; lag < maxLag; lag++) {
    let correlation = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < bufferLength - lag; i++) {
      correlation += audioData[i] * audioData[i + lag];
      norm1 += audioData[i] * audioData[i];
      norm2 += audioData[i + lag] * audioData[i + lag];
    }

    const normalizedCorrelation = correlation / (Math.sqrt(norm1 * norm2) + 1e-10);

    if (normalizedCorrelation > bestCorrelation) {
      bestCorrelation = normalizedCorrelation;
      bestLag = lag;
    }
  }

  if (bestCorrelation < 0.5) return -1; // Low confidence

  // Parabolic interpolation for sub-sample accuracy
  const lag1 = bestLag - 1;
  const lag2 = bestLag + 1;

  const y1 = computeCorrelation(audioData, lag1, bufferLength);
  const y2 = computeCorrelation(audioData, lag2, bufferLength);

  const delta = (y1 - y2) / (2 * (y1 - 2 * bestCorrelation + y2));
  const refinedLag = bestLag + delta;

  return sampleRate / refinedLag;
}

function computeCorrelation(data: Float32Array, lag: number, bufferLength: number): number {
  if (lag <= 0 || lag >= bufferLength) return -1;
  let correlation = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (let i = 0; i < bufferLength - lag; i++) {
    correlation += data[i] * data[i + lag];
    norm1 += data[i] * data[i];
    norm2 += data[i + lag] * data[i + lag];
  }
  return correlation / (Math.sqrt(norm1 * norm2) + 1e-10);
}

/**
 * Main pitch detection function
 * @param audioData - Float32Array of mono audio samples
 * @param sampleRate - Sample rate in Hz
 * @returns PitchDetectionResult or null if no pitch detected
 */
export function detectPitch(
  audioData: Float32Array,
  sampleRate: number
): PitchDetectionResult | null {
  const frequency = detectPitchAutocorrelation(audioData, sampleRate);
  if (frequency < 20 || frequency > 5000) return null;

  const midiNumber = frequencyToMidi(frequency);
  const { noteName, cents } = frequencyToNoteName(frequency);

  // Confidence based on autocorrelation peak
  let confidence = 0;
  let maxCorrelation = -1;
  const bufferLength = audioData.length;
  const maxLag = Math.floor(sampleRate / 50);
  const minLag = Math.floor(sampleRate / 2000);

  for (let lag = minLag; lag < maxLag; lag++) {
    let correlation = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < bufferLength - lag; i++) {
      correlation += audioData[i] * audioData[i + lag];
      norm1 += audioData[i] * audioData[i];
      norm2 += audioData[i + lag] * audioData[i + lag];
    }
    const normalizedCorrelation = correlation / (Math.sqrt(norm1 * norm2) + 1e-10);
    if (normalizedCorrelation > maxCorrelation) {
      maxCorrelation = normalizedCorrelation;
    }
  }
  confidence = Math.max(0, Math.min(1, maxCorrelation));

  return {
    frequency,
    confidence,
    noteName,
    midiNumber,
    cents,
  };
}

/**
 * Create a MediaRecorder that captures microphone input and provides
 * pitch detection callbacks.
 */
export async function createPitchDetector(
  onPitch: (result: PitchDetectionResult) => void,
  onError: (error: Error) => void,
  bufferSize: number = 4096
): Promise<{
  start: () => Promise<void>;
  stop: () => void;
  isRunning: () => boolean;
}> {
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let isActive = false;
  let animationFrameId: number | null = null;

  async function start(): Promise<void> {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = bufferSize * 2;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);

      isActive = true;
      detectLoop();
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  function detectLoop(): void {
    if (!isActive || !analyser) return;

    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);

    const result = detectPitch(dataArray, audioContext!.sampleRate);
    if (result) {
      onPitch(result);
    }

    animationFrameId = requestAnimationFrame(detectLoop);
  }

  function stop(): void {
    isActive = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    analyser = null;
  }

  return { start, stop, isRunning: () => isActive };
}
