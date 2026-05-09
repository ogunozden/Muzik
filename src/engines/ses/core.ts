export type BrowserAudioContext = AudioContext & {
  close?: () => Promise<void>;
};

let audioContext: BrowserAudioContext | null = null;
let masterGain: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

// Active oscillators tracking for stopAll
export const activeOscillators = new Set<OscillatorNode>();
export const activeSources = new Set<AudioBufferSourceNode>();

export function getAudioContext(): BrowserAudioContext | null {
  return audioContext;
}

function getAudioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.AudioContext ?? (window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
}

export function getOrCreateAudioContext(): BrowserAudioContext | null {
  // If context exists but is closed, clean up and create new
  if (audioContext?.state === "closed") {
    disposeAudioContext();
  }

  if (audioContext) {
    return audioContext;
  }

  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    return null;
  }

  audioContext = new AudioContextConstructor() as BrowserAudioContext;
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(audioContext.destination);

  return audioContext;
}

export function getMasterGain(): GainNode | null {
  return masterGain;
}

export function getOrCreateNoiseBuffer(context: BrowserAudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;

  noiseBuffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * 0.5),
    context.sampleRate
  );
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  return noiseBuffer;
}

export function disposeAudioContext(): void {
  if (audioContext?.state !== "closed") {
    audioContext?.close().catch(() => undefined);
  }
  audioContext = null;
  masterGain = null;
  noiseBuffer = null;
  activeOscillators.clear();
  activeSources.clear();
}

export function trackOscillator(osc: OscillatorNode): void {
  activeOscillators.add(osc);
  osc.addEventListener("ended", () => {
    activeOscillators.delete(osc);
  });
}

export function trackSource(source: AudioBufferSourceNode): void {
  activeSources.add(source);
  source.addEventListener("ended", () => {
    activeSources.delete(source);
  });
}

export function stopAll(): void {
  // Stop all active oscillators
  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch {
      // Already stopped
    }
  });
  activeOscillators.clear();

  // Stop all active buffer sources
  activeSources.forEach((source) => {
    try {
      source.stop();
    } catch {
      // Already stopped
    }
  });
  activeSources.clear();

  // Suspend audio context
  if (audioContext?.state === "running") {
    audioContext.suspend().catch(() => undefined);
  }
}
